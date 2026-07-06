import type { AcceptanceSpecV2 } from "../../types/acceptance-spec.js";
import type { AuditActor } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import type { ProjectState } from "../../types/state.js";
import type { OutcomeVerdict } from "../../types/outcome-ledger.js";
import { createAuditEvent, writeAuditEvent } from "../audit/index.js";
import { loadAutomation } from "../automation/ai-guard.js";
import { authorizeAiOutcomeCheck } from "../automation/authorization.js";
import { resolveAcceptanceSpecs } from "../acceptance/acceptance-source.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";
import { verifyHashOf } from "../task/task-ledger-store.js";
import { snapshotEvidence, probeEntryHash } from "./evidence-snapshot.js";
import { lastOutcomeEventHash, reconcileLedgerWithAudit } from "./outcome-integrity.js";
import { appendMeasurement, readOutcomeLedger } from "./outcome-ledger-store.js";
import { runProbe, verdictFor } from "./probe-runner.js";
import { assembleMeasurement, auditResultFor, outcomeMessage } from "./outcome-check-record.js";
import { fsyncAuditJsonl } from "./fsync.js";

type OutcomeSpec = Extract<AcceptanceSpecV2, { kind: "outcome" }>;

// SOP 0.9.0 (AM-017) — `ocn outcome check <ac-id>` core. Reconcile-first (drift
// / tamper → refuse, exit 2); probe OUTSIDE the lock (long-running); exec_error
// → exit 4, NO ledger write; zero-hit snapshot forces NO_EVIDENCE. Dual-write:
// the outcome_measured audit event is committed (non-swallowing + fsync) BEFORE
// the ledger rename, inside the store lock. HUMAN-authorized: ai_agent needs
// phase-2 auto + BUILD/VERIFY + rationale; never over MCP.

export interface OutcomeCheckOptions {
  readonly cwd: string;
  readonly acId: string;
  readonly actor?: AuditActor;
  readonly rationale?: string;
}

export interface OutcomeCheckData {
  readonly command: "outcome.check";
  readonly acId: string;
  readonly verdict?: OutcomeVerdict;
  readonly value?: number | null;
  readonly reason?: string;
}

function findOutcomeSpec(specs: readonly AcceptanceSpecV2[], acId: string): OutcomeSpec | null {
  const spec = specs.find((s) => s.id === acId);
  if (spec === undefined || spec.kind !== "outcome") return null;
  return spec;
}

async function guardAiActor(
  cwd: string,
  state: ProjectState,
  opts: OutcomeCheckOptions,
): Promise<CommandResult<OutcomeCheckData> | null> {
  if ((opts.actor ?? "user") !== "ai_agent") return null;
  const automation = await loadAutomation(cwd);
  const refusal = authorizeAiOutcomeCheck(
    { ...automation, ...(opts.rationale !== undefined ? { rationale: opts.rationale } : {}) },
    state.currentStateId,
  );
  if (refusal === null) return null;
  return blocked("ERR_IO_OR_CONFIG", refusal.message, {
    command: "outcome.check",
    acId: opts.acId,
    reason: refusal.reason,
  } satisfies OutcomeCheckData);
}

async function loadState(cwd: string): Promise<ProjectState | CommandResult<OutcomeCheckData>> {
  try {
    return await readState(cwd);
  } catch (err) {
    if (err instanceof StateNotFoundError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          "OCN is not initialized here. Run `ocn init` first.",
          "当前目录未初始化 OCN，请先 `ocn init`。",
        ),
      );
    }
    if (err instanceof StateInvalidError) {
      return blocked("ERR_STATE_MACHINE", msg("state.json is invalid.", "state.json 内容不合法。"));
    }
    throw err;
  }
}

export async function runOutcomeCheck(
  opts: OutcomeCheckOptions,
): Promise<CommandResult<OutcomeCheckData>> {
  const loaded = await loadState(opts.cwd);
  if ("ok" in loaded) return loaded;
  const state = loaded;

  const aiRefusal = await guardAiActor(opts.cwd, state, opts);
  if (aiRefusal !== null) return aiRefusal;

  const specs = (await resolveAcceptanceSpecs(opts.cwd)) ?? [];
  const spec = findOutcomeSpec(specs, opts.acId);
  if (spec === null) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `No outcome AC "${opts.acId}" in docs/03 (an outcome AC carries kind: outcome + a measure contract).`,
        `docs/03 中没有效果验收项 "${opts.acId}"（效果 AC 需 kind: outcome + 测量契约）。`,
      ),
      {
        command: "outcome.check",
        acId: opts.acId,
        reason: "no_outcome_ac",
      } satisfies OutcomeCheckData,
    );
  }

  const ledger = await readOutcomeLedger(opts.cwd);
  if (ledger === null || !ledger.entries.some((e) => e.acId === opts.acId)) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        "No frozen contract for this AC — pass the acceptance gate (`ocn check`) first to freeze it.",
        "该 AC 尚未冻结契约——请先通过验收门（`ocn check`）冻结。",
      ),
      {
        command: "outcome.check",
        acId: opts.acId,
        reason: "not_frozen",
      } satisfies OutcomeCheckData,
    );
  }

  const breach = await reconcileLedgerWithAudit(opts.cwd, specs);
  if (breach !== null) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `Outcome ledger integrity failed (${breach.kind}) for ${breach.acId}: ${breach.detail}. Re-freeze via docs/03 + \`ocn check\`, or re-measure.`,
        `效果台账完整性校验失败（${breach.kind}）于 ${breach.acId}：${breach.detail}。请改 docs/03 + \`ocn check\` 重新冻结，或重新测量。`,
      ),
      { command: "outcome.check", acId: opts.acId, reason: breach.kind } satisfies OutcomeCheckData,
    );
  }

  const probe = await runProbe(opts.cwd, spec.measure); // OUTSIDE the lock
  if (probe.outcome.status === "exec_error") {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        `Probe execution error (no measurement written): ${probe.outcome.detail}.`,
        `探针执行错误（未写入台账）：${probe.outcome.detail}。`,
      ),
      {
        command: "outcome.check",
        acId: opts.acId,
        reason: "exec_error",
      } satisfies OutcomeCheckData,
    );
  }

  const snap = await snapshotEvidence(opts.cwd, spec.measure.source);
  const probeHash = await probeEntryHash(opts.cwd, spec.measure.command);
  const commandHash = verifyHashOf(spec.measure.command);

  // Zero-hit snapshot forces NO_EVIDENCE (exit-0 with no evidence is never PASS).
  const zeroHit = snap.evidenceHash === "";
  const verdict: OutcomeVerdict =
    zeroHit || probe.outcome.status === "no_evidence"
      ? "NO_EVIDENCE"
      : verdictFor(probe.outcome, spec.measure.threshold);
  const measuredValue = probe.outcome.status === "measured" ? probe.outcome.value : null;
  const value = verdict === "NO_EVIDENCE" ? null : measuredValue;

  const measurement = await appendMeasurement(
    opts.cwd,
    opts.acId,
    async ({ seq, prevEventHash }) =>
      assembleMeasurement({
        acId: opts.acId,
        seq,
        prevEventHash,
        verdict,
        value,
        commandHash,
        evidenceHash: snap.evidenceHash,
        evidenceFiles: snap.evidenceFiles,
        probeEntryHash: probeHash,
        durationMs: probe.durationMs,
      }),
    async (auditData) => {
      await writeAuditEvent(
        opts.cwd,
        createAuditEvent({
          eventType: "outcome_measured",
          result: auditResultFor(verdict),
          actor: opts.actor ?? "user",
          source: "cli",
          projectRoot: opts.cwd,
          currentStateId: state.currentStateId,
          currentStepId: state.currentStepId,
          command: "outcome check",
          message: outcomeMessage(opts.acId, verdict, value, probeHash, opts.rationale),
          data: auditData,
        }),
      );
      await fsyncAuditJsonl(opts.cwd);
    },
    () => lastOutcomeEventHash(opts.cwd),
  );

  return ok(outcomeMessage(opts.acId, verdict, value, probeHash, undefined), {
    command: "outcome.check",
    acId: opts.acId,
    verdict: measurement.verdict,
    value: measurement.value,
  } satisfies OutcomeCheckData);
}
