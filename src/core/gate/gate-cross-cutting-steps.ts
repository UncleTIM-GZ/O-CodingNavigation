import type { CommandResult } from "../../types/result.js";
import type { SopProfile } from "../../types/sop.js";
import type { GateResult } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { blocked } from "../result.js";
import { runContractDriftStep } from "../contract/contract-gate-step.js";
import { runOutcomeShipGateStep } from "./outcome-ship-gate-step.js";
import { readinessStepBlockOrNull } from "./readiness-step.js";

// Cross-cutting gate steps extracted from gate-runner.ts (§G decomposition).
// Each runs regardless of whether the step has a required artifact, returns a
// mapped blocked result or null (= continue), and is heavily covered by the
// gate / readiness / contract / outcome-ship suites — the byte-equivalence net
// for this extraction.

export type BaseAudit = (
  eventType: "artifact_gate_run" | "artifact_gate_passed" | "artifact_gate_blocked",
  result: "executed" | "pass" | "blocked",
  message: { en: string; zh: string },
  data?: unknown,
) => CreateAuditEventInput;

export interface GateStepCtx {
  readonly cwd: string;
  readonly state: ProjectState;
  readonly profile: SopProfile;
  readonly relativeArtifactPath: string | null;
  readonly executeCommands: boolean;
  readonly baseAudit: BaseAudit;
}

/** SOP 0.4.0 (AM-004) — readiness cross-cutting gate. Runs whether or not the
 *  step has a required artifact, so a no-artifact step cannot advance past unmet
 *  readiness. Shared with `ocn check`. */
export function readinessOrNull(ctx: GateStepCtx): Promise<CommandResult<GateResult> | null> {
  return readinessStepBlockOrNull<GateResult>({
    cwd: ctx.cwd,
    profile: ctx.profile,
    state: ctx.state,
    executeCommands: ctx.executeCommands,
    buildBlockedData: () => ({
      status: "blocked",
      currentStateId: ctx.state.currentStateId,
      currentStepId: ctx.state.currentStepId,
      ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
      missingRequiredSectionIds: [],
      blockingReasons: ["readiness_not_met"],
    }),
    emitAudit: (message, ids) =>
      safeAudit(
        ctx.cwd,
        createAuditEvent(
          ctx.baseAudit("artifact_gate_blocked", "blocked", message, {
            status: "blocked",
            reason: "readiness_not_met",
            blockingCheckIds: ids,
          }),
        ),
      ),
  });
}

/** AM-012 — Contract Backbone drift gate. Cross-cutting like readiness, but
 *  opt-in and self-limited to BUILD/VERIFY. Null = skip / pass. */
export async function contractDriftOrNull(
  ctx: GateStepCtx,
): Promise<CommandResult<GateResult> | null> {
  const step = await runContractDriftStep({
    cwd: ctx.cwd,
    stateId: ctx.state.currentStateId,
    executeScan: ctx.executeCommands,
  });
  if (step.kind === "skip" || step.kind === "pass") return null;
  if (step.kind === "io_error") return blocked("ERR_IO_OR_CONFIG", step.message);
  const result: GateResult = {
    status: "blocked",
    currentStateId: ctx.state.currentStateId,
    currentStepId: ctx.state.currentStepId,
    ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
    missingRequiredSectionIds: [],
    blockingReasons: [...step.blockingReasons],
  };
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      ctx.baseAudit("artifact_gate_blocked", "blocked", step.message, {
        status: "blocked",
        reason: step.blockingReasons[0],
      }),
    ),
  );
  return blocked(step.failureCode, step.message, result);
}

/** SOP 0.9.0 (AM-017) §C — SHIP gate for step_release. Self-guarded to
 *  state_ship + a 0.9.0+ pin. step_release is null-artifact-only, so this MUST
 *  run in the null-artifact branch (the normal-pass path never reaches it).
 *  Null = skip / pass. */
export async function shipGateOrNull(ctx: GateStepCtx): Promise<CommandResult<GateResult> | null> {
  const step = await runOutcomeShipGateStep({
    cwd: ctx.cwd,
    profile: ctx.profile,
    currentStateId: ctx.state.currentStateId,
  });
  if (step.kind === "skip" || step.kind === "pass") return null;
  if (step.kind === "io_error") return blocked("ERR_IO_OR_CONFIG", step.message);
  const result: GateResult = {
    status: "blocked",
    currentStateId: ctx.state.currentStateId,
    currentStepId: ctx.state.currentStepId,
    missingRequiredSectionIds: [],
    blockingReasons: [step.reason],
  };
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      ctx.baseAudit("artifact_gate_blocked", "blocked", step.message, {
        status: "blocked",
        reason: step.reason,
      }),
    ),
  );
  // A missing/corrupt ledger or integrity breach is an invalid-artifact
  // condition (exit 2); an unmeasured/undecided outcome is a gate failure.
  const code =
    step.reason === "outcome_ledger_missing" || step.reason.startsWith("outcome_integrity_")
      ? "ERR_ARTIFACT_INVALID"
      : "ERR_GATE_FAILED";
  return blocked(code, step.message, result);
}
