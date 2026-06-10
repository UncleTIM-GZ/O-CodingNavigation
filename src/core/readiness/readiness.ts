import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { ReadinessCheckOutcome, ReadinessLedger } from "../../types/readiness.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { runReadinessGate } from "../gate/readiness-gate.js";

// SOP 0.4.0 — `ocn readiness list` core. Evaluates the full rulebook against
// the project (re-using the gate evaluator, which also persists the ledger)
// and returns the complete per-check table. Pull-mode: no audit spam (§4.7).

export interface ReadinessListData {
  readonly command: "readiness.list";
  readonly ledger: ReadinessLedger;
  /** block-severity checks currently at FAIL/UNKNOWN (what `advance` would block on). */
  readonly blocking: readonly ReadinessCheckOutcome[];
}

export async function listReadiness(opts: {
  readonly cwd: string;
}): Promise<CommandResult<ReadinessListData>> {
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
      return blocked("ERR_STATE_MACHINE", msg("state.json is invalid.", "state.json 内容不合法。"));
    }
    throw err;
  }

  const profile = resolveProfileForProject(state.project.sopProfileVersion);
  if (profile.readinessYaml === undefined) {
    return blocked(
      "ERR_SOP_VERSION",
      msg(
        `SOP profile ${profile.version} has no readiness rulebook (needs 0.4.0+; re-init with \`ocn init --sop-version 0.4.0\`).`,
        `SOP profile ${profile.version} 不含就绪规则手册（需 0.4.0+；可用 \`ocn init --sop-version 0.4.0\` 初始化）。`,
      ),
    );
  }

  const outcome = await runReadinessGate({ cwd: opts.cwd, profile, state });
  if (outcome.ledger === null) {
    return blocked("ERR_ARTIFACT_INVALID", outcome.message);
  }
  const counts = outcome.ledger.checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const summary = `PASS ${counts["PASS"] ?? 0} / FAIL ${counts["FAIL"] ?? 0} / UNKNOWN ${counts["UNKNOWN"] ?? 0} / NA ${counts["NA"] ?? 0}`;
  return ok(
    msg(
      `Readiness evaluated (tier ${outcome.ledger.tier}): ${summary}.`,
      `就绪评估完成（tier ${outcome.ledger.tier}）：${summary}。`,
    ),
    { command: "readiness.list", ledger: outcome.ledger, blocking: outcome.blocking },
  );
}
