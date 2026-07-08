import type { CommandResult } from "../../types/result.js";
import type { GateResult } from "../../types/state-machine.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { blocked } from "../result.js";
import { writeLogicGraphProjection } from "../logic/logic-graph-store.js";
import { evaluateTaskSpecs } from "../task/task-gate.js";
import { writeTaskLedger } from "../task/task-ledger-store.js";
import { evaluateAcceptanceSpecs } from "../acceptance/acceptance-gate.js";
import { writeAcceptanceSpecs } from "../acceptance/acceptance-spec-store.js";
import {
  readOutcomeLedger,
  reconcileFrozenContracts,
  writeOutcomeLedger,
} from "../outcome/outcome-ledger-store.js";
import { outcomeSpecGateBlockOrNull } from "../outcome/outcome-spec-gate.js";
import { requiresOutcome } from "../outcome/pin.js";
import { evaluateLogicBackbone } from "./logic-backbone-gate.js";
import { runOutcomeReflectGateStep } from "./outcome-reflect-gate-step.js";
import type { GateStepCtx } from "./gate-cross-cutting-steps.js";

// Artifact-present gate steps extracted from gate-runner.ts (§G decomposition).
// Each runs only for its own step, after the required-section gate passes;
// returns a mapped blocked result or null (= continue). Byte-equivalent with
// the previous inline blocks — the acceptance / logic / task / reflect suites
// are the net.

type RequiredSections = readonly { readonly id: string }[];

/** SOP 0.8.0 (AM-015) — acceptance backbone gate on docs/03; on pass freezes
 *  the projection + (0.9.0) the outcome contracts, then enforces the SPEC
 *  outcome requirement. */
export async function acceptanceStepOrNull(
  ctx: GateStepCtx,
  content: string,
  required: RequiredSections,
): Promise<CommandResult<GateResult> | null> {
  if (
    ctx.state.currentStepId !== "step_acceptance_criteria" ||
    !required.some((r) => r.id === "section_acceptance_specs")
  ) {
    return null;
  }
  const outcome = evaluateAcceptanceSpecs(content, requiresOutcome(ctx.profile.version));
  if (!outcome.ok) {
    const acResult: GateResult = {
      status: "blocked",
      currentStateId: ctx.state.currentStateId,
      currentStepId: ctx.state.currentStepId,
      ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
      missingRequiredSectionIds: [],
      ...(outcome.blockingReasons !== undefined
        ? { blockingReasons: outcome.blockingReasons }
        : {}),
    };
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
          status: "blocked",
          reason: outcome.blockingReasons?.[0],
          issues: outcome.issues,
        }),
      ),
    );
    return blocked("ERR_ARTIFACT_INVALID", outcome.message, acResult);
  }
  if (outcome.projection === undefined) return null;
  try {
    await writeAcceptanceSpecs(ctx.cwd, outcome.projection);
    // SOP 0.9.0 (AM-017) — freeze outcome contracts as a side-effect of the
    // acceptance gate passing (no `ocn outcome freeze` command, invariant §8).
    if (outcome.projection.version === 2) {
      const prevLedger = await readOutcomeLedger(ctx.cwd);
      const nextLedger = reconcileFrozenContracts(outcome.projection.items, prevLedger);
      if (nextLedger !== null) await writeOutcomeLedger(ctx.cwd, nextLedger);
    }
  } catch (err) {
    const ioMessage = msg(
      `Failed to persist acceptance specs projection: ${(err as Error).message}`,
      `验收规格投影写入失败：${(err as Error).message}`,
    );
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
          status: "blocked",
          reason: "acceptance_specs_write_failed",
        }),
      ),
    );
    return blocked("ERR_IO_OR_CONFIG", ioMessage);
  }
  // SOP 0.9.0 (AM-017) §3.1 — SPEC outcome requirement (dormant <0.9.0): a
  // passing projection must declare >=1 outcome AC or a valid no-outcome waiver.
  const specBlock = await outcomeSpecGateBlockOrNull(
    ctx.cwd,
    ctx.profile.version,
    outcome.projection,
  );
  if (specBlock === null) return null;
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      ctx.baseAudit("artifact_gate_blocked", "blocked", specBlock.message, {
        status: "blocked",
        reason: specBlock.reason,
      }),
    ),
  );
  return blocked("ERR_GATE_FAILED", specBlock.message, {
    status: "blocked",
    currentStateId: ctx.state.currentStateId,
    currentStepId: ctx.state.currentStepId,
    ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
    missingRequiredSectionIds: [],
    blockingReasons: [specBlock.reason],
  });
}

/** SOP 0.3.0 — structural gate for the logic backbone; on pass persists the
 *  normalized graph projection. */
export async function logicStepOrNull(
  ctx: GateStepCtx,
  content: string,
): Promise<CommandResult<GateResult> | null> {
  if (ctx.state.currentStepId !== "step_logic_backbone") return null;
  const outcome = evaluateLogicBackbone(content);
  if (!outcome.ok) {
    const lbResult: GateResult = {
      status: "blocked",
      currentStateId: ctx.state.currentStateId,
      currentStepId: ctx.state.currentStepId,
      ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
      missingRequiredSectionIds: [],
      ...(outcome.blockingReasons !== undefined
        ? { blockingReasons: outcome.blockingReasons }
        : {}),
    };
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
          status: "blocked",
          reason: outcome.blockingReasons?.[0],
          issues: outcome.issues,
        }),
      ),
    );
    return blocked("ERR_ARTIFACT_INVALID", outcome.message, lbResult);
  }
  if (outcome.graph === undefined) return null;
  try {
    await writeLogicGraphProjection(ctx.cwd, outcome.graph);
  } catch (err) {
    const ioMessage = msg(
      `Failed to persist logic graph projection: ${(err as Error).message}`,
      `逻辑图投影写入失败：${(err as Error).message}`,
    );
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
          status: "blocked",
          reason: "logic_graph_projection_write_failed",
        }),
      ),
    );
    return blocked("ERR_IO_OR_CONFIG", ioMessage);
  }
  return null;
}

/** SOP 0.5.0 (AM-007) — task backbone gate on the build plan; on pass persists
 *  the ledger with verify commands hash-frozen. */
export async function taskStepOrNull(
  ctx: GateStepCtx,
  content: string,
  required: RequiredSections,
): Promise<CommandResult<GateResult> | null> {
  if (
    ctx.state.currentStepId !== "step_build_plan" ||
    !required.some((r) => r.id === "section_task_specs")
  ) {
    return null;
  }
  const outcome = await evaluateTaskSpecs({
    cwd: ctx.cwd,
    profile: ctx.profile,
    buildPlanContent: content,
  });
  if (!outcome.ok) {
    const tbResult: GateResult = {
      status: "blocked",
      currentStateId: ctx.state.currentStateId,
      currentStepId: ctx.state.currentStepId,
      ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
      missingRequiredSectionIds: [],
      ...(outcome.blockingReasons !== undefined
        ? { blockingReasons: outcome.blockingReasons }
        : {}),
    };
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
          status: "blocked",
          reason: outcome.blockingReasons?.[0],
          issues: outcome.issues,
        }),
      ),
    );
    return blocked("ERR_ARTIFACT_INVALID", outcome.message, tbResult);
  }
  if (outcome.ledger === undefined) return null;
  try {
    await writeTaskLedger(ctx.cwd, outcome.ledger);
  } catch (err) {
    const ioMessage = msg(
      `Failed to persist task ledger: ${(err as Error).message}`,
      `任务台账写入失败：${(err as Error).message}`,
    );
    await safeAudit(
      ctx.cwd,
      createAuditEvent(
        ctx.baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
          status: "blocked",
          reason: "task_ledger_write_failed",
        }),
      ),
    );
    return blocked("ERR_IO_OR_CONFIG", ioMessage);
  }
  return null;
}

/** SOP 0.9.0 (AM-017) §D.1 — REFLECT gate: mechanically cross-check the
 *  `### Outcome References` lines against the frozen ledger (self-guarded to
 *  step_evolution_report + a 0.9.0+ pin). */
export async function reflectStepOrNull(
  ctx: GateStepCtx,
  content: string,
): Promise<CommandResult<GateResult> | null> {
  const reflect = await runOutcomeReflectGateStep({
    cwd: ctx.cwd,
    profile: ctx.profile,
    currentStepId: ctx.state.currentStepId,
    content,
  });
  if (reflect.kind === "io_error") return blocked("ERR_IO_OR_CONFIG", reflect.message);
  if (reflect.kind !== "blocked") return null;
  const rResult: GateResult = {
    status: "blocked",
    currentStateId: ctx.state.currentStateId,
    currentStepId: ctx.state.currentStepId,
    ...(ctx.relativeArtifactPath !== null ? { artifactPath: ctx.relativeArtifactPath } : {}),
    missingRequiredSectionIds: [],
    blockingReasons: [reflect.reason],
  };
  await safeAudit(
    ctx.cwd,
    createAuditEvent(
      ctx.baseAudit("artifact_gate_blocked", "blocked", reflect.message, {
        status: "blocked",
        reason: reflect.reason,
      }),
    ),
  );
  // Structural defects (missing ledger, malformed reference) → exit 2; a
  // ledger-mismatch (right structure, wrong numbers) → exit 1.
  const structural =
    reflect.reason === "outcome_ledger_missing" || reflect.reason === "malformed_reference";
  return blocked(structural ? "ERR_ARTIFACT_INVALID" : "ERR_GATE_FAILED", reflect.message, rResult);
}
