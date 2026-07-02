import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import type { SopProfile } from "../../types/sop.js";
import type { GateResult, GateStatus } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import { computeArtifactGateStatus } from "../artifact/gate-status.js";
import { parseHeadings } from "../artifact/markdown-parser.js";
import type { CreateAuditEventInput } from "../audit/audit-event.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { writeLogicGraphProjection } from "../logic/logic-graph-store.js";
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import { evaluateTaskSpecs } from "../task/task-gate.js";
import { writeTaskLedger } from "../task/task-ledger-store.js";
import { evaluateAcceptanceSpecs } from "../acceptance/acceptance-gate.js";
import { writeAcceptanceSpecs } from "../acceptance/acceptance-spec-store.js";
import {
  readOutcomeLedger,
  reconcileFrozenContracts,
  writeOutcomeLedger,
} from "../outcome/outcome-ledger-store.js";
import { runContractDriftStep } from "../contract/contract-gate-step.js";
import { evaluateLogicBackbone } from "./logic-backbone-gate.js";
import { readinessStepBlockOrNull } from "./readiness-step.js";
import { StateInvalidError, StateNotFoundError, readState } from "../state/state-store.js";

export interface RunGateOptions {
  readonly cwd: string;
  /** When provided, audit events emitted from this gate carry the same
   *  correlationId — used by `advanceState` to thread the advance flow. */
  readonly correlationId?: string;
  /** Caller identity for audit attribution. Defaults to actor=user/source=cli. */
  readonly actor?: "user" | "system" | "ai_agent";
  readonly source?: "cli" | "core" | "test";
  readonly command?: string;
  /**
   * Optional explicit SOP profile to validate against. When omitted, the
   * runtime default profile is used (currently 0.1.0). SOP 0.2.0 PR 3
   * (DEC-023) introduced this override so callers can validate the SOP 0.2.0
   * required-section gates without flipping the default runtime profile.
   * Internals are reused for PR 4 (advance flow). The default CLI / MCP /
   * advance behavior does NOT change in PR 3.
   */
  readonly profile?: SopProfile;
  /** W1 — false for read-only callers (MCP run_gate): readiness probe
   *  commands are NOT executed (reported UNKNOWN). Defaults to true. */
  readonly executeCommands?: boolean;
}

const ENOENT = "ENOENT";

async function readArtifactOrNull(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === ENOENT) return null;
    throw err;
  }
}

/**
 * Run the artifact gate for the current step. Pure read — no state mutation,
 * no lock acquisition. Emits artifact_gate_run + artifact_gate_passed |
 * artifact_gate_blocked via safeAudit (best-effort).
 *
 * Per CLAUDE.md §4.7, gate emission is push-mode; this function is the only
 * canonical emitter for `artifact_gate_*` events in PR #4.
 */
export async function runGate(opts: RunGateOptions): Promise<CommandResult<GateResult>> {
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

  // AM-004 — honor the project's pinned profile when it carries a readiness
  // rulebook (0.4.0+); all older pins keep the default-profile behavior.
  const profile = opts.profile ?? resolveProfileForProject(state.project.sopProfileVersion);
  const required = profile.requiredSectionsForStep(state.currentStepId);
  const relativeArtifactPath = profile.artifactPathForStep(state.currentStepId);

  const baseAudit = (
    eventType: "artifact_gate_run" | "artifact_gate_passed" | "artifact_gate_blocked",
    result: "executed" | "pass" | "blocked",
    message: { en: string; zh: string },
    data?: unknown,
  ): CreateAuditEventInput => ({
    eventType,
    result,
    actor: opts.actor ?? "user",
    source: opts.source ?? "cli",
    projectRoot: opts.cwd,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
    command: opts.command ?? "gate",
    message,
    ...(relativeArtifactPath !== null
      ? { relatedPaths: [join(opts.cwd, relativeArtifactPath)] }
      : {}),
    ...(opts.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
    ...(data !== undefined ? { data } : {}),
  });

  // Always emit gate_run, regardless of outcome.
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      baseAudit(
        "artifact_gate_run",
        "executed",
        msg(
          `Artifact gate executed for step ${state.currentStepId}.`,
          `已对 step ${state.currentStepId} 执行步骤产物门禁检查。`,
        ),
      ),
    ),
  );

  // SOP 0.4.0 (AM-004) — readiness cross-cutting gate. Cross-cutting: it runs
  // whether or not the step has a required artifact (so a no-artifact step
  // cannot advance past unmet readiness). Shared with `ocn check`.
  const readinessOrNull = (): Promise<CommandResult<GateResult> | null> =>
    readinessStepBlockOrNull<GateResult>({
      cwd: opts.cwd,
      profile,
      state,
      executeCommands: opts.executeCommands ?? true,
      buildBlockedData: () => ({
        status: "blocked",
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        ...(relativeArtifactPath !== null ? { artifactPath: relativeArtifactPath } : {}),
        missingRequiredSectionIds: [],
        blockingReasons: ["readiness_not_met"],
      }),
      emitAudit: (message, ids) =>
        safeAudit(
          opts.cwd,
          createAuditEvent(
            baseAudit("artifact_gate_blocked", "blocked", message, {
              status: "blocked",
              reason: "readiness_not_met",
              blockingCheckIds: ids,
            }),
          ),
        ),
    });

  // AM-012 — Contract Backbone drift gate. Cross-cutting like readiness, but
  // opt-in and self-limited to BUILD/VERIFY (the shared step skips otherwise).
  // On pass it persists the projection; on a blocking drift it returns the
  // mapped failure code. Null = skip / pass.
  const contractDriftOrNull = async (): Promise<CommandResult<GateResult> | null> => {
    const step = await runContractDriftStep({
      cwd: opts.cwd,
      stateId: state.currentStateId,
      executeScan: opts.executeCommands ?? true,
    });
    if (step.kind === "skip" || step.kind === "pass") return null;
    if (step.kind === "io_error") return blocked("ERR_IO_OR_CONFIG", step.message);
    const result: GateResult = {
      status: "blocked",
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      ...(relativeArtifactPath !== null ? { artifactPath: relativeArtifactPath } : {}),
      missingRequiredSectionIds: [],
      blockingReasons: [...step.blockingReasons],
    };
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        baseAudit("artifact_gate_blocked", "blocked", step.message, {
          status: "blocked",
          reason: step.blockingReasons[0],
        }),
      ),
    );
    return blocked(step.failureCode, step.message, result);
  };

  // Step has no required artifact — readiness still applies (cross-cutting),
  // then auto-pass with not_applicable.
  if (relativeArtifactPath === null) {
    const readinessBlock = await readinessOrNull();
    if (readinessBlock !== null) return readinessBlock;
    const contractBlock = await contractDriftOrNull();
    if (contractBlock !== null) return contractBlock;
    const result: GateResult = {
      status: "not_applicable",
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
    };
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        baseAudit(
          "artifact_gate_passed",
          "pass",
          msg(
            `Step ${state.currentStepId} has no required artifact (not applicable).`,
            `step ${state.currentStepId} 无需产物（不适用）。`,
          ),
          { status: "not_applicable" },
        ),
      ),
    );
    return ok(msg("Gate passed (not applicable).", "门禁通过（不适用）。"), result);
  }

  const artifactPath = join(opts.cwd, relativeArtifactPath);
  const content = await readArtifactOrNull(artifactPath);

  if (content === null) {
    const missing = required.map((r) => r.id);
    const result: GateResult = {
      status: "blocked",
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      artifactPath: relativeArtifactPath,
      missingRequiredSectionIds: missing,
      blockingReasons: ["artifact_missing"],
    };
    const message = msg(
      `Artifact missing for step ${state.currentStepId}: ${relativeArtifactPath}.`,
      `step ${state.currentStepId} 的产物缺失：${relativeArtifactPath}。`,
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        baseAudit("artifact_gate_blocked", "blocked", message, {
          status: "blocked",
          missingRequiredSectionIds: missing,
          reason: "artifact_missing",
        }),
      ),
    );
    return blocked("ERR_GATE_FAILED", message, result);
  }

  const headings = parseHeadings(content);
  const gateStatus = computeArtifactGateStatus({
    artifactPath: relativeArtifactPath,
    headings,
    required,
  });

  if (gateStatus.status === "blocked") {
    const message = msg(
      `Step ${state.currentStepId} is missing required sections: ${gateStatus.missingRequiredSectionIds.join(", ")}.`,
      `step ${state.currentStepId} 缺少必填章节：${gateStatus.missingRequiredSectionIds.join("、")}。`,
    );
    const result: GateResult = {
      status: "blocked",
      currentStateId: state.currentStateId,
      currentStepId: state.currentStepId,
      artifactPath: relativeArtifactPath,
      missingRequiredSectionIds: gateStatus.missingRequiredSectionIds,
      blockingReasons: ["missing_required_sections"],
    };
    await safeAudit(
      opts.cwd,
      createAuditEvent(
        baseAudit("artifact_gate_blocked", "blocked", message, {
          status: "blocked",
          missingRequiredSectionIds: gateStatus.missingRequiredSectionIds,
          reason: "missing_required_sections",
        }),
      ),
    );
    return blocked("ERR_GATE_FAILED", message, result);
  }

  // SOP 0.8.0 (AM-015 / DEC-041) — acceptance backbone gate on docs/03. Runs
  // only after the required-section gate passes AND only for profiles that
  // require section_acceptance_specs (0.8.0+); validates the Acceptance Spec
  // blocks (structural defects) and, on pass, freezes the projection as the
  // machine source of AC ids for build-plan traces.
  if (
    state.currentStepId === "step_acceptance_criteria" &&
    required.some((r) => r.id === "section_acceptance_specs")
  ) {
    const outcome = evaluateAcceptanceSpecs(content);
    if (!outcome.ok) {
      const acResult: GateResult = {
        status: "blocked",
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        artifactPath: relativeArtifactPath,
        missingRequiredSectionIds: [],
        ...(outcome.blockingReasons !== undefined
          ? { blockingReasons: outcome.blockingReasons }
          : {}),
      };
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
            status: "blocked",
            reason: outcome.blockingReasons?.[0],
            issues: outcome.issues,
          }),
        ),
      );
      return blocked("ERR_ARTIFACT_INVALID", outcome.message, acResult);
    }
    if (outcome.projection !== undefined) {
      try {
        await writeAcceptanceSpecs(opts.cwd, outcome.projection);
        // SOP 0.9.0 (AM-016) — freeze outcome contracts as a side-effect of the
        // acceptance gate passing (no `ocn outcome freeze` command, invariant §8).
        // A v2 projection carries kind:outcome specs; seed/refresh the ledger so
        // `ocn outcome check` has a frozen command hash to run + drift-check.
        if (outcome.projection.version === 2) {
          const prevLedger = await readOutcomeLedger(opts.cwd);
          const nextLedger = reconcileFrozenContracts(outcome.projection.items, prevLedger);
          if (nextLedger !== null) await writeOutcomeLedger(opts.cwd, nextLedger);
        }
      } catch (err) {
        const ioMessage = msg(
          `Failed to persist acceptance specs projection: ${(err as Error).message}`,
          `验收规格投影写入失败：${(err as Error).message}`,
        );
        await safeAudit(
          opts.cwd,
          createAuditEvent(
            baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
              status: "blocked",
              reason: "acceptance_specs_write_failed",
            }),
          ),
        );
        return blocked("ERR_IO_OR_CONFIG", ioMessage);
      }
    }
  }

  // SOP 0.3.0 — structural gate for the logic backbone. Runs only after the
  // required-section gate passes; validates the embedded graph (orphans,
  // dangling refs, cycles, unbound triggers, missing roles) and, on pass,
  // persists the normalized projection as the machine source of truth.
  if (state.currentStepId === "step_logic_backbone") {
    const outcome = evaluateLogicBackbone(content);
    if (!outcome.ok) {
      const lbResult: GateResult = {
        status: "blocked",
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        artifactPath: relativeArtifactPath,
        missingRequiredSectionIds: [],
        ...(outcome.blockingReasons !== undefined
          ? { blockingReasons: outcome.blockingReasons }
          : {}),
      };
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
            status: "blocked",
            reason: outcome.blockingReasons?.[0],
            issues: outcome.issues,
          }),
        ),
      );
      return blocked("ERR_ARTIFACT_INVALID", outcome.message, lbResult);
    }
    if (outcome.graph !== undefined) {
      try {
        await writeLogicGraphProjection(opts.cwd, outcome.graph);
      } catch (err) {
        const ioMessage = msg(
          `Failed to persist logic graph projection: ${(err as Error).message}`,
          `逻辑图投影写入失败：${(err as Error).message}`,
        );
        await safeAudit(
          opts.cwd,
          createAuditEvent(
            baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
              status: "blocked",
              reason: "logic_graph_projection_write_failed",
            }),
          ),
        );
        return blocked("ERR_IO_OR_CONFIG", ioMessage);
      }
    }
  }

  // SOP 0.5.0 (AM-007 / DEC-032) — task backbone gate on the build plan. Runs
  // only after the required-section gate passes AND only for profiles that
  // require section_task_specs (0.5.0+); validates the Task Spec blocks (six
  // hard defects) and, on pass, persists the ledger with verify commands
  // hash-frozen (R4 — the referee is not on the player's write path).
  if (
    state.currentStepId === "step_build_plan" &&
    required.some((r) => r.id === "section_task_specs")
  ) {
    const outcome = await evaluateTaskSpecs({
      cwd: opts.cwd,
      profile,
      buildPlanContent: content,
    });
    if (!outcome.ok) {
      const tbResult: GateResult = {
        status: "blocked",
        currentStateId: state.currentStateId,
        currentStepId: state.currentStepId,
        artifactPath: relativeArtifactPath,
        missingRequiredSectionIds: [],
        ...(outcome.blockingReasons !== undefined
          ? { blockingReasons: outcome.blockingReasons }
          : {}),
      };
      await safeAudit(
        opts.cwd,
        createAuditEvent(
          baseAudit("artifact_gate_blocked", "blocked", outcome.message, {
            status: "blocked",
            reason: outcome.blockingReasons?.[0],
            issues: outcome.issues,
          }),
        ),
      );
      return blocked("ERR_ARTIFACT_INVALID", outcome.message, tbResult);
    }
    if (outcome.ledger !== undefined) {
      try {
        await writeTaskLedger(opts.cwd, outcome.ledger);
      } catch (err) {
        const ioMessage = msg(
          `Failed to persist task ledger: ${(err as Error).message}`,
          `任务台账写入失败：${(err as Error).message}`,
        );
        await safeAudit(
          opts.cwd,
          createAuditEvent(
            baseAudit("artifact_gate_blocked", "blocked", ioMessage, {
              status: "blocked",
              reason: "task_ledger_write_failed",
            }),
          ),
        );
        return blocked("ERR_IO_OR_CONFIG", ioMessage);
      }
    }
  }

  // SOP 0.4.0 (AM-004) — readiness gate after the section / logic gates.
  const readinessBlock = await readinessOrNull();
  if (readinessBlock !== null) return readinessBlock;

  // AM-012 — contract drift gate (opt-in; BUILD/VERIFY only).
  const contractBlock = await contractDriftOrNull();
  if (contractBlock !== null) return contractBlock;

  // pass (warning state currently unused; reserved for PR #5+)
  const result: GateResult = {
    status: gateStatus.status as GateStatus,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
    artifactPath: relativeArtifactPath,
    missingRequiredSectionIds: [],
  };
  const passMessage = msg(
    `Step ${state.currentStepId} passed the artifact gate.`,
    `step ${state.currentStepId} 已通过步骤产物门禁。`,
  );
  await safeAudit(
    opts.cwd,
    createAuditEvent(
      baseAudit("artifact_gate_passed", "pass", passMessage, {
        status: gateStatus.status,
      }),
    ),
  );
  return ok(passMessage, result);
}
