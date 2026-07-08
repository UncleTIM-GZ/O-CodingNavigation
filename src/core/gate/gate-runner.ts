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
import { blocked, ok } from "../result.js";
import { resolveProfileForProject } from "../sop/loader.js";
import {
  contractDriftOrNull,
  readinessOrNull,
  shipGateOrNull,
  type GateStepCtx,
} from "./gate-cross-cutting-steps.js";
import {
  acceptanceStepOrNull,
  logicStepOrNull,
  reflectStepOrNull,
  taskStepOrNull,
} from "./gate-artifact-steps.js";
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

  // §G — the cross-cutting steps (readiness / contract drift / SHIP) share this
  // context; each returns a mapped blocked result or null (= continue). Their
  // bodies live in gate-cross-cutting-steps.ts.
  const ctx: GateStepCtx = {
    cwd: opts.cwd,
    state,
    profile,
    relativeArtifactPath,
    executeCommands: opts.executeCommands ?? true,
    baseAudit,
  };

  // Step has no required artifact — readiness still applies (cross-cutting),
  // then the SHIP gate (state_ship only), then auto-pass with not_applicable.
  if (relativeArtifactPath === null) {
    const readinessBlock = await readinessOrNull(ctx);
    if (readinessBlock !== null) return readinessBlock;
    const contractBlock = await contractDriftOrNull(ctx);
    if (contractBlock !== null) return contractBlock;
    const shipBlock = await shipGateOrNull(ctx);
    if (shipBlock !== null) return shipBlock;
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

  // §G — artifact-present gate steps (acceptance / logic / task / reflect),
  // each self-guarded to its own step; bodies live in gate-artifact-steps.ts.
  const acceptanceBlock = await acceptanceStepOrNull(ctx, content, required);
  if (acceptanceBlock !== null) return acceptanceBlock;

  const logicBlock = await logicStepOrNull(ctx, content);
  if (logicBlock !== null) return logicBlock;

  const taskBlock = await taskStepOrNull(ctx, content, required);
  if (taskBlock !== null) return taskBlock;

  const reflectBlock = await reflectStepOrNull(ctx, content);
  if (reflectBlock !== null) return reflectBlock;

  // SOP 0.4.0 (AM-004) — readiness gate after the section / logic gates.
  const readinessBlock = await readinessOrNull(ctx);
  if (readinessBlock !== null) return readinessBlock;

  // AM-012 — contract drift gate (opt-in; BUILD/VERIFY only).
  const contractBlock = await contractDriftOrNull(ctx);
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
