import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { computeArtifactGateStatus } from "./artifact/gate-status.js";
import { parseHeadings } from "./artifact/markdown-parser.js";
import { readLogicGraphProjection } from "./logic/logic-graph-store.js";
import { summarizeLogicGraph, type LogicBackboneSummary } from "./logic/logic-graph-summary.js";
import { readReadinessLedger } from "./readiness/readiness-store.js";
import type { ReadinessLedger } from "../types/readiness.js";
import { readTaskLedger } from "./task/task-ledger-store.js";
import type { TaskLedger } from "../types/task.js";
import { readContractGraph } from "./contract/contract-graph-store.js";
import { readContractConfig } from "./contract/contract-config.js";
import { summarizeContractGraph, type ContractSummary } from "./gate/contract-drift-gate.js";
import {
  type AutomationStatusView,
  governanceReminder,
  loadAutomationStatus,
} from "./automation/governance-text.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { loadSopProfile } from "./sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "./state/state-store.js";

export interface BriefOptions {
  readonly cwd: string;
}

export interface BriefData {
  readonly project: ProjectState["project"];
  readonly currentStateId: string;
  readonly currentStepId: string;
  /** Absolute path to the current step's artifact, OR empty when the step has
   *  no required artifact (BUILD/VERIFY/SHIP/REFLECT step stubs in PR #4). */
  readonly currentArtifactPath: string;
  readonly currentArtifactStatus: "pass" | "warning" | "blocked" | "missing" | "not_applicable";
  readonly currentObjective: string;
  readonly currentBlockers: readonly string[];
  readonly nextActions: readonly string[];
  readonly aiGovernanceReminder: string;
  readonly uncertaintyPolicy: string;
  /** Present once a validated logic backbone has been persisted (SOP 0.3.0).
   *  Surfaces execution order + trigger bindings so BUILD cannot drift. */
  readonly logicBackbone?: LogicBackboneSummary;
  /** Present once a readiness evaluation has been persisted (SOP 0.4.0). */
  readonly readiness?: ReadinessBriefSummary;
  /** Present once a task ledger has been persisted (SOP 0.5.0 / AM-007). */
  readonly tasks?: TaskBriefSummary;
  /** Present once the contract drift gate has run (AM-012; opt-in). */
  readonly contractBackbone?: ContractSummary;
  /** AM-009 — present only when auto mode is on (or suspended). Manual-mode
   *  briefs are byte-identical to pre-AM-009 output. */
  readonly automation?: AutomationStatusView;
}

const UNCERTAINTY_POLICY =
  'If data is insufficient, AI must explicitly state "数据不足" or "需要人工确认" ' +
  "rather than guess. Never fabricate facts about state, artifacts, or gate results.";

// PR #4 — brief uses the SOP profile to find the current step's artifact +
// required sections, replacing the PR #1 hardcoded PRD path.
export async function generateBrief(opts: BriefOptions): Promise<CommandResult<BriefData>> {
  let state: ProjectState;
  try {
    state = await readState(opts.cwd);
  } catch (err) {
    if (err instanceof StateNotFoundError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "OCN is not initialized in this directory. Run `ocn init` first.",
          "当前目录未初始化 OCN，请先执行 `ocn init`。",
        ),
      );
    }
    if (err instanceof StateInvalidError) {
      return blocked(
        "ERR_STATE_MACHINE",
        msg("state.json is invalid.", "state.json 内容不合法。"),
        undefined,
        err.issues,
      );
    }
    throw err;
  }

  const profile = loadSopProfile();
  const required = profile.requiredSectionsForStep(state.currentStepId);
  const relativeArtifactPath = profile.artifactPathForStep(state.currentStepId);

  let artifactStatus: BriefData["currentArtifactStatus"];
  let blockers: readonly string[];
  let absoluteArtifactPath = "";

  if (relativeArtifactPath === null) {
    artifactStatus = "not_applicable";
    blockers = [];
  } else {
    absoluteArtifactPath = join(opts.cwd, relativeArtifactPath);
    artifactStatus = "missing";
    blockers = required.map((r) => r.id);
    try {
      const content = await fs.readFile(absoluteArtifactPath, "utf8");
      const headings = parseHeadings(content);
      const gate = computeArtifactGateStatus({
        artifactPath: relativeArtifactPath,
        headings,
        required,
      });
      artifactStatus = gate.status;
      blockers = gate.missingRequiredSectionIds;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // file missing → already initialized to "missing" + all required sections.
    }
  }

  // Derive a CLI hint from the artifact filename (docs/02-prd.md → "prd").
  const docCommand =
    relativeArtifactPath === null
      ? null
      : (() => {
          const match = /\/(?:\d{2}-)?([a-z0-9-]+)\.md$/.exec(relativeArtifactPath);
          return match?.[1] ?? null;
        })();

  const nextActions: readonly string[] =
    relativeArtifactPath === null
      ? [
          "This step has no required artifact in the current SOP profile.",
          "Run `ocn advance` to move to the next step.",
        ]
      : [
          docCommand
            ? `Edit ${relativeArtifactPath} to fill all required sections (run \`ocn doc create ${docCommand}\` for a template).`
            : `Edit ${relativeArtifactPath} to fill all required sections.`,
          "Run `ocn gate` to verify the artifact gate.",
          "Run `ocn advance` once the gate passes.",
        ];

  const objective =
    relativeArtifactPath === null
      ? `Run \`ocn advance\` to leave step ${state.currentStepId}.`
      : `Produce ${relativeArtifactPath} that passes the Step Artifact Gate (required sections present).`;

  // Anti-drift: when a validated logic backbone exists, fold its execution
  // order + trigger bindings into the brief so every BUILD-phase prompt sees
  // the logic spine.
  const graph = await readLogicGraphProjection(opts.cwd);
  const logicBackbone = graph === null ? undefined : summarizeLogicGraph(graph);

  // SOP 0.4.0 (AM-004) — fold the last readiness evaluation into the brief
  // so the unmet-readiness worklist (with fix_hints) travels with every
  // prompt. Absent when the project has never been evaluated (pre-0.4.0).
  const ledger = await readReadinessLedger(opts.cwd);
  const readiness = ledger === null ? undefined : summarizeReadiness(ledger);

  // SOP 0.5.0 (AM-007 / DEC-032) — fold the task ledger into the brief so the
  // BUILD loop (pending count + next dispatchable task) travels with every
  // prompt. Absent until the build-plan gate passes under 0.5.0+.
  const taskLedger = await readTaskLedger(opts.cwd);
  const tasks = taskLedger === null ? undefined : summarizeTasks(taskLedger);

  // AM-012 — fold the contract drift coverage into the brief so the BUILD/VERIFY
  // loop sees wired/undeclared/unverified counts. Read only when the project is
  // still opted in, so a disabled contract never surfaces a stale projection.
  const contractEnabled = (await readContractConfig(opts.cwd)).enabled;
  const contractGraph = contractEnabled ? await readContractGraph(opts.cwd) : null;
  const contractBackbone =
    contractGraph === null ? undefined : summarizeContractGraph(contractGraph);

  // AM-009 — the governance reminder follows the human's automation grant;
  // manual mode renders the pre-AM-009 text byte-identically.
  const automationStatus = await loadAutomationStatus(opts.cwd);
  const automationActive =
    automationStatus.phase1 || automationStatus.phase2 || automationStatus.suspended;

  return ok(
    msg(
      `Brief for ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
      `项目简报 ${state.project.name} — ${state.currentStateId} / ${state.currentStepId}`,
    ),
    {
      project: state.project,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      currentArtifactPath: absoluteArtifactPath,
      currentArtifactStatus: artifactStatus,
      currentObjective: objective,
      currentBlockers: blockers,
      nextActions,
      aiGovernanceReminder: governanceReminder(automationStatus),
      uncertaintyPolicy: UNCERTAINTY_POLICY,
      ...(logicBackbone !== undefined ? { logicBackbone } : {}),
      ...(readiness !== undefined ? { readiness } : {}),
      ...(tasks !== undefined ? { tasks } : {}),
      ...(contractBackbone !== undefined ? { contractBackbone } : {}),
      ...(automationActive ? { automation: automationStatus } : {}),
    },
  );
}

/** Compact task-ledger summary for the brief (SOP 0.5.0 / AM-007). */
export interface TaskBriefSummary {
  readonly total: number;
  readonly done: number;
  readonly pending: number;
  /** First pending task whose depends are all done, or null. */
  readonly nextTaskId: string | null;
}

function summarizeTasks(ledger: TaskLedger): TaskBriefSummary {
  const doneIds = new Set(ledger.tasks.filter((t) => t.status === "done").map((t) => t.id));
  const pending = ledger.tasks.filter((t) => t.status === "pending");
  const next = pending.find((t) => t.depends.every((d) => doneIds.has(d)));
  return {
    total: ledger.tasks.length,
    done: doneIds.size,
    pending: pending.length,
    nextTaskId: next?.id ?? null,
  };
}

/** Compact readiness summary for the brief: counts + open items with hints. */
export interface ReadinessBriefSummary {
  readonly tier: string;
  readonly counts: string;
  /** block-severity FAIL/UNKNOWN items as "id: fix_hint" lines. */
  readonly openItems: readonly string[];
  /** warn-severity FAIL/UNKNOWN items (never block; surfaced here only). */
  readonly warnings: readonly string[];
  /** P4 — waived items ("id: reason"). Always surfaced: waivers must never
   *  be invisible. */
  readonly waivedItems: readonly string[];
  /** P4 — WAIVED/(PASS+WAIVED). A high ratio is itself a verdict. */
  readonly waivedRatio: string;
}

function summarizeReadiness(ledger: ReadinessLedger): ReadinessBriefSummary {
  const count = (v: string): number => ledger.checks.filter((c) => c.verdict === v).length;
  const open = ledger.checks.filter(
    (c) => c.severity === "block" && (c.verdict === "FAIL" || c.verdict === "UNKNOWN"),
  );
  const warnings = ledger.checks.filter(
    (c) => c.severity === "warn" && (c.verdict === "FAIL" || c.verdict === "UNKNOWN"),
  );
  const waived = ledger.checks.filter((c) => c.verdict === "WAIVED");
  const pass = count("PASS");
  return {
    tier: ledger.tier,
    counts: `PASS ${pass} / WAIVED ${waived.length} / FAIL ${count("FAIL")} / UNKNOWN ${count("UNKNOWN")} / NA ${count("NA")}`,
    openItems: open.map((c) => `${c.id} [${c.verdict}]: ${c.fixHint.zh}`),
    warnings: warnings.map((c) => `${c.id}: ${c.fixHint.zh}`),
    waivedItems: waived.map((c) => `${c.id}: ${c.waived?.reason ?? ""}`),
    waivedRatio: `${waived.length}/${pass + waived.length}`,
  };
}
