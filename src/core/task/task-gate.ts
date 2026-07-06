import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { BilingualMessage } from "../../types/i18n.js";
import type { SopProfile } from "../../types/sop.js";
import type { TaskLedger, TaskSpec } from "../../types/task.js";
import { parseAcceptanceCriteria } from "../execution-navigator/acceptance-parser.js";
import { readAcceptanceSpecs } from "../acceptance/acceptance-spec-store.js";
import { resolveAcceptanceSpecs } from "../acceptance/acceptance-source.js";
import { msg } from "../i18n.js";
import { readLogicGraphProjection } from "../logic/logic-graph-store.js";
import { readOutcomeLedger } from "../outcome/outcome-ledger-store.js";
import { requiresOutcome } from "../outcome/pin.js";
import { buildLedger, readTaskLedger, sha256Hex, verifyHashOf } from "./task-ledger-store.js";
import { parseTaskSpecs, type ParsedTask, type TaskDefect } from "./task-spec-parser.js";
import { describeTaskDefect, validateTaskSpecs } from "./task-validator.js";

// SOP 0.5.0 (AM-007 / DEC-032) — Task Backbone gate orchestration, used by the
// gate runner on step_build_plan (after the section gate, before readiness).
// Mirrors evaluateLogicBackbone + the projection-write discipline: defects
// block with ERR_ARTIFACT_INVALID; on pass the ledger (verify commands frozen
// as hashes — R4) is returned for the runner to persist.

const MAX_DEFECTS_IN_MESSAGE = 6;

export interface TaskGateOutcome {
  readonly ok: boolean;
  readonly message: BilingualMessage;
  readonly blockingReasons?: readonly string[];
  readonly issues?: readonly TaskDefect[];
  readonly warnings?: readonly string[];
  readonly ledger?: TaskLedger;
}

export interface EvaluateTaskSpecsOptions {
  readonly cwd: string;
  readonly profile: SopProfile;
  readonly buildPlanContent: string;
}

/** Canonical AC ids from docs/03 (only criteria with explicit, non-generated
 *  ids count as addressable), or null when the file is absent/unlocatable. */
async function readAcIds(cwd: string, profile: SopProfile): Promise<ReadonlySet<string> | null> {
  const rel = profile.artifactPathForStep("step_acceptance_criteria");
  if (rel === null) return null;

  // Staleness-safe (SOP 0.8.0+): the frozen projection while docs/03 is
  // unchanged since the gate, else the current structured parse — so a trace to
  // a post-gate-added AC is not falsely dangling, and (critically) a trace to a
  // post-gate-DELETED AC is not falsely green. Null → legacy markdown fallback
  // (pre-0.8.0 docs with no structured Acceptance Specs section).
  const specs = await resolveAcceptanceSpecs(cwd, rel);
  if (specs !== null) return new Set(specs.map((s) => s.id));

  let content: string;
  try {
    content = await fs.readFile(join(cwd, rel), "utf8");
  } catch {
    return null;
  }
  const parsed = parseAcceptanceCriteria(content, { path: rel });
  return new Set(parsed.criteria.filter((c) => c.originalId !== null).map((c) => c.id));
}

async function readLogicNodeIds(cwd: string): Promise<ReadonlySet<string> | null> {
  const graph = await readLogicGraphProjection(cwd);
  if (graph === null) return null;
  return new Set(graph.nodes.map((n) => n.id));
}

function composeBlockedMessage(defects: readonly TaskDefect[]): BilingualMessage {
  const shown = defects.slice(0, MAX_DEFECTS_IN_MESSAGE);
  const more = defects.length - shown.length;
  const en = shown.map((d) => describeTaskDefect(d).en).join("; ");
  const zh = shown.map((d) => describeTaskDefect(d).zh).join("；");
  const moreEn = more > 0 ? ` (+${more} more)` : "";
  const moreZh = more > 0 ? `（另有 ${more} 项）` : "";
  return msg(`Task Specs have defects: ${en}${moreEn}`, `任务规格存在缺陷：${zh}${moreZh}`);
}

function toTaskSpec(task: ParsedTask): TaskSpec {
  return {
    id: task.id,
    goal: task.goal,
    traces: [...task.traces],
    touches: [...task.touches],
    verifyCommand: task.verify.trim(),
    verifyHash: verifyHashOf(task.verify),
    dod: task.dod,
    depends: [...task.depends],
    ...(task.phase !== undefined ? { phase: task.phase } : {}),
    ...(task.timeoutSeconds !== undefined ? { timeoutSeconds: task.timeoutSeconds } : {}),
  };
}

/** SOP 0.9.0 (AM-017) §E.2 (AC-12) — a project whose only "defect" is an empty
 *  build plan is legitimate when it carries >=1 UNWAIVED outcome AC: a frozen
 *  outcome probe IS a verifiable deliverable, so BUILD needn't enumerate tasks.
 *  The predicate is "unwaived" (not merely "present") so an all-waived project
 *  can't silently empty BUILD (silent-failure Q3). Dormant below a 0.9.0 pin. */
async function hasUnwaivedOutcomeAc(opts: EvaluateTaskSpecsOptions): Promise<boolean> {
  if (!requiresOutcome(opts.profile.version)) return false;
  const projection = await readAcceptanceSpecs(opts.cwd);
  if (projection === null || projection.version !== 2) return false;
  const outcomeIds = projection.items.filter((s) => s.kind === "outcome").map((s) => s.id);
  if (outcomeIds.length === 0) return false;
  const ledger = await readOutcomeLedger(opts.cwd);
  const waived = new Set(
    (ledger?.entries ?? []).filter((e) => e.waived !== undefined).map((e) => e.acId),
  );
  return outcomeIds.some((id) => !waived.has(id));
}

export async function evaluateTaskSpecs(opts: EvaluateTaskSpecsOptions): Promise<TaskGateOutcome> {
  const parsed = parseTaskSpecs(opts.buildPlanContent);
  const [acIds, logicNodeIds] = await Promise.all([
    readAcIds(opts.cwd, opts.profile),
    readLogicNodeIds(opts.cwd),
  ]);
  const validation = validateTaskSpecs(parsed.tasks, { acIds, logicNodeIds });
  let defects: readonly TaskDefect[] = [...parsed.defects, ...validation.defects];
  let warnings: readonly string[] = [...parsed.warnings, ...validation.warnings];

  // §E.2 — downgrade a lone `no_tasks` defect to a warning for a pure-outcome
  // project. Only when it is the SOLE defect (any real spec defect still blocks).
  if (
    defects.length === 1 &&
    defects[0]?.code === "no_tasks" &&
    (await hasUnwaivedOutcomeAc(opts))
  ) {
    defects = [];
    warnings = [
      ...warnings,
      "Build plan has no tasks; accepted because the project carries an unwaived outcome AC (a frozen outcome probe is the verifiable deliverable).",
    ];
  }

  if (defects.length > 0) {
    return {
      ok: false,
      message: composeBlockedMessage(defects),
      blockingReasons: ["task_spec_defects"],
      issues: defects,
      warnings,
    };
  }

  const prev = await readTaskLedger(opts.cwd);
  const ledger = buildLedger(
    parsed.tasks.map(toTaskSpec),
    prev,
    sha256Hex(parsed.sectionText ?? ""),
  );
  return {
    ok: true,
    message: msg(
      `Task Specs validated (${ledger.tasks.length} task(s); verify commands frozen).`,
      `任务规格校验通过（${ledger.tasks.length} 个任务；verify 命令已冻结）。`,
    ),
    warnings,
    ledger,
  };
}
