import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import { type ReadinessWaiver } from "../../types/readiness.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { parseReadinessRulebook } from "./rulebook-loader.js";
import { runWaiverProbe } from "./waiver-probe.js";
import { readWaivers, writeWaivers } from "./waiver-store.js";

// P4 — `ocn readiness waive` core. HUMAN-ONLY by construction: registered as
// a CLI command and never exposed over MCP (§4.8 — like advance and formal
// decisions). Grants are conditional (waive-with-probe): the precondition
// probe must pass AT GRANT TIME (no dead waivers) and is re-verified at
// every gate run; the waiver expires when the project leaves this state.
// Granting is a push audit event (`readiness_waived`).

/** Keep audit lines well under the 3500-byte JSONL cap. */
const AUDIT_FIELD_MAX = 200;

function truncate(s: string): string {
  return s.length <= AUDIT_FIELD_MAX ? s : `${s.slice(0, AUDIT_FIELD_MAX - 1)}…`;
}

export interface WaiveReadinessData {
  readonly command: "readiness.waive";
  readonly checkId: string;
  readonly stateId: string;
  readonly probeDetail: string;
}

export interface WaiveReadinessOptions {
  readonly cwd: string;
  readonly checkId: string;
  readonly reason: string;
  readonly probe: string;
  readonly now?: () => Date;
}

export async function waiveReadiness(
  opts: WaiveReadinessOptions,
): Promise<CommandResult<WaiveReadinessData>> {
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
        `SOP profile ${profile.version} has no readiness rulebook (needs 0.4.0+; run \`ocn sop upgrade --target 0.4.0\`).`,
        `SOP profile ${profile.version} 不含就绪规则手册（需 0.4.0+；可运行 \`ocn sop upgrade --target 0.4.0\` 升级）。`,
      ),
    );
  }
  const parsed = parseReadinessRulebook(profile.readinessYaml);
  const rule = parsed.rulebook?.checks.find((c) => c.id === opts.checkId);
  if (rule === undefined) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `Unknown readiness check "${opts.checkId}" (see \`ocn readiness list\` for valid ids).`,
        `未知就绪检查 "${opts.checkId}"（可用 \`ocn readiness list\` 查看有效 id）。`,
      ),
    );
  }
  if (rule.waivable === false) {
    return blocked(
      "ERR_GATE_FAILED",
      msg(
        `Check ${rule.id} is not waivable. ${rule.fix_hint.en}`,
        `检查 ${rule.id} 不可豁免。${rule.fix_hint.zh}`,
      ),
    );
  }

  // Grant-time probe run — refuse to grant a waiver whose precondition does
  // not currently hold (no dead waivers).
  const probe = await runWaiverProbe(opts.cwd, opts.probe);
  if (!probe.ok) {
    return blocked(
      "ERR_GATE_FAILED",
      msg(
        `Waiver refused — precondition probe does not hold: ${probe.detail}`,
        `豁免被拒——前提探针当前不成立：${probe.detail}`,
      ),
    );
  }

  const now = opts.now ?? ((): Date => new Date());
  const waiver: ReadinessWaiver = {
    checkId: rule.id,
    reason: opts.reason,
    probe: opts.probe,
    stateId: state.currentStateId,
    grantedAt: now().toISOString(),
  };
  const existing = await readWaivers(opts.cwd);
  await writeWaivers(opts.cwd, [...existing.filter((w) => w.checkId !== rule.id), waiver]);

  await safeAudit(
    opts.cwd,
    createAuditEvent({
      eventType: "readiness_waived",
      result: "executed",
      actor: "user",
      source: "cli",
      projectRoot: opts.cwd,
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      command: "readiness.waive",
      message: msg(
        `Readiness check ${rule.id} waived (conditional).`,
        `就绪检查 ${rule.id} 已条件豁免。`,
      ),
      data: {
        checkId: rule.id,
        reason: truncate(opts.reason),
        probe: truncate(opts.probe),
        stateId: state.currentStateId,
      },
    }),
  );

  return ok(
    msg(
      `Waived ${rule.id} in ${state.currentStateId} (probe re-verified at every gate; expires on state change).`,
      `已在 ${state.currentStateId} 豁免 ${rule.id}（每次门禁重验前提探针；跨 state 失效需重申）。`,
    ),
    {
      command: "readiness.waive",
      checkId: rule.id,
      stateId: state.currentStateId,
      probeDetail: probe.detail,
    },
  );
}
