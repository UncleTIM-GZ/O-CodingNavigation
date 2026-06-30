import type { BilingualMessage } from "../../types/i18n.js";
import type { SopProfile } from "../../types/sop.js";
import type { ProjectState } from "../../types/state.js";
import type { ReadinessCheckOutcome, ReadinessLedger } from "../../types/readiness.js";
import { msg } from "../i18n.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { evaluateReadiness } from "../readiness/evaluator.js";
import { computeEnforcedFromMap } from "../readiness/due-state.js";
import { checkConfigDrift, commitConfigSnapshot } from "../readiness/freeze-check.js";
import { readProjectCommands } from "../readiness/project-config.js";
import { parseReadinessRulebook } from "../readiness/rulebook-loader.js";
import { writeReadinessLedger } from "../readiness/readiness-store.js";
import { readWaivers } from "../readiness/waiver-store.js";

// SOP 0.4.0 (AM-004) — the readiness cross-cutting gate. Activates only when
// the resolved profile bundles a rulebook (0.4.0+); 0.1.0–0.3.0 projects are
// untouched. Blocking semantics are open-world: a block-severity,
// tier-required check passes the gate only on PASS or WAIVED (P4:
// conditional waivers — precondition probe re-verified here on every run,
// stale outside the granting state) — FAIL and UNKNOWN both block, and each
// blocking check surfaces its fix_hint. Warn-severity checks never block
// (they surface in brief).

export interface ReadinessGateOutcome {
  readonly ok: boolean;
  readonly message: BilingualMessage;
  readonly blocking: readonly ReadinessCheckOutcome[];
  readonly ledger: ReadinessLedger | null;
}

const MAX_LISTED = 6;

function blockingMessage(blocking: readonly ReadinessCheckOutcome[]): BilingualMessage {
  const listed = blocking.slice(0, MAX_LISTED);
  const en = listed.map((c) => `[${c.role}] ${c.verdict}: ${c.fixHint.en}`).join(" | ");
  const zh = listed.map((c) => `[${c.role}] ${c.verdict}：${c.fixHint.zh}`).join("｜");
  const more = blocking.length > listed.length ? ` (+${blocking.length - listed.length} more)` : "";
  return msg(
    `Readiness gate blocked — ${blocking.length} check(s) not met: ${en}${more}`,
    `就绪门禁未通过——${blocking.length} 项未满足：${zh}${more}`,
  );
}

/**
 * Evaluate readiness for the project and persist the ledger. Never throws:
 * an unparsable rulebook blocks with a clear message (a 0.4.0 project with a
 * broken rulebook must not silently pass).
 */
export async function runReadinessGate(opts: {
  readonly cwd: string;
  readonly profile: SopProfile;
  readonly state: ProjectState;
  /** W1 — false in read-only contexts (MCP): probe commands are not run. */
  readonly executeCommands?: boolean;
}): Promise<ReadinessGateOutcome> {
  const yamlText = opts.profile.readinessYaml;
  if (yamlText === undefined) {
    return {
      ok: true,
      message: msg("Readiness gate not applicable.", "就绪门禁不适用。"),
      blocking: [],
      ledger: null,
    };
  }
  const parsed = parseReadinessRulebook(yamlText);
  if (parsed.rulebook === null) {
    return {
      ok: false,
      message: msg(
        `Readiness rulebook is invalid: ${parsed.errors[0] ?? "unknown error"}`,
        `就绪规则手册不合法：${parsed.errors[0] ?? "未知错误"}`,
      ),
      blocking: [],
      ledger: null,
    };
  }
  const commands = await readProjectCommands(opts.cwd);

  // P5 (R4) — referee-input drift detection. Compare → audit → commit the
  // new baseline (a crash between audit and commit re-reports next run —
  // repeating a report beats losing one). safeAudit never throws.
  const drift = await checkConfigDrift(opts.cwd, opts.state.project.tier, commands);
  if (drift.drifts.length > 0) {
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        eventType: "readiness_config_changed",
        result: "detected",
        actor: "system",
        source: "core",
        projectRoot: opts.cwd,
        currentStateId: opts.state.currentStateId,
        currentStepId: opts.state.currentStepId,
        command: "readiness.gate",
        message: msg(
          `Readiness probe config changed: ${drift.drifts.map((d) => d.key).join(", ")}`,
          `就绪探针配置发生变更：${drift.drifts.map((d) => d.key).join("、")}`,
        ),
        data: { changes: drift.drifts },
      }),
    );
    await commitConfigSnapshot(opts.cwd, opts.state.project.tier, commands).catch(() => undefined);
  }

  const waivers = await readWaivers(opts.cwd);
  // AM-014 — precise activation: derive each block rule's enforced-from state
  // from the SOP dependency graph (needs the profile; the evaluator stays
  // profile-free). Empty map when the rulebook hasn't opted in.
  const enforcedFromByRule = computeEnforcedFromMap(parsed.rulebook, opts.profile);
  const ledger = await evaluateReadiness({
    root: opts.cwd,
    rulebook: parsed.rulebook,
    projectTier: opts.state.project.tier,
    commands,
    waivers,
    currentStateId: opts.state.currentStateId,
    executeCommands: opts.executeCommands ?? true,
    enforcedFromByRule,
    stateOrder: opts.profile.stateOrder,
  });
  try {
    await writeReadinessLedger(opts.cwd, ledger);
  } catch {
    // Persisting the projection is best-effort; the verdict still stands.
  }
  const blocking = ledger.checks.filter(
    (c) => c.severity === "block" && (c.verdict === "FAIL" || c.verdict === "UNKNOWN"),
  );
  if (blocking.length > 0) {
    return { ok: false, message: blockingMessage(blocking), blocking, ledger };
  }
  return {
    ok: true,
    message: msg("Readiness gate passed.", "就绪门禁通过。"),
    blocking: [],
    ledger,
  };
}
