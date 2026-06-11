import type { BilingualMessage } from "../../types/i18n.js";
import type { SopProfile } from "../../types/sop.js";
import type { ProjectState } from "../../types/state.js";
import type { ReadinessCheckOutcome, ReadinessLedger } from "../../types/readiness.js";
import { msg } from "../i18n.js";
import { evaluateReadiness } from "../readiness/evaluator.js";
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
  const waivers = await readWaivers(opts.cwd);
  const ledger = await evaluateReadiness({
    root: opts.cwd,
    rulebook: parsed.rulebook,
    projectTier: opts.state.project.tier,
    commands,
    waivers,
    currentStateId: opts.state.currentStateId,
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
