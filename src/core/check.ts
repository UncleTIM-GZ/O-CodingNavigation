import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { AuditEvent } from "../types/audit.js";
import type { BilingualMessage } from "../types/i18n.js";
import type { CommandResult } from "../types/result.js";
import type { SopProfile } from "../types/sop.js";
import type { ProjectState } from "../types/state.js";
import { computeArtifactGateStatus } from "./artifact/gate-status.js";
import { parseHeadings } from "./artifact/markdown-parser.js";
import { createAuditEvent, safeAudit } from "./audit/index.js";
import { msg } from "./i18n.js";
import { blocked, ok } from "./result.js";
import { loadSopProfile } from "./sop/loader.js";
import { StateInvalidError, StateNotFoundError, readState } from "./state/state-store.js";

export interface CheckOptions {
  readonly cwd: string;
}

// P1-002 — extends ArtifactGateStatus.status with `not_applicable` so steps
// without a required artifact (e.g. state_build stubs) can still surface a
// stable, machine-readable result instead of an error.
export type CheckStatus = "pass" | "warning" | "blocked" | "not_applicable";

export interface CheckData {
  readonly artifactPath: string;
  readonly status: CheckStatus;
  readonly missingRequiredSectionIds: readonly string[];
}

// P1-002 — every artifact ID in v1.0 follows the convention `step_X` →
// `artifact_X`. Renaming an artifact ID is an SOP-version-breaking change
// (CLAUDE.md §4.2), so deriving the projection at call sites is safe.
function artifactIdForStep(stepId: string): string {
  return stepId.replace(/^step_/, "artifact_");
}

function isKnownStep(profile: SopProfile, stepId: string): boolean {
  for (const stateId of profile.stateOrder) {
    if (profile.stepsForState(stateId).includes(stepId)) return true;
  }
  return false;
}

// Derive an `ocn doc create <type>` hint from the artifact filename
// (docs/02-prd.md → "prd"). Returns null when the filename doesn't match
// the `[NN-]name.md` shape so the message degrades gracefully rather than
// suggesting a bogus subcommand.
function docTypeHintFromPath(relativePath: string): string | null {
  const match = /\/(?:\d{2}-)?([a-z0-9-]+)\.md$/.exec(relativePath);
  return match?.[1] ?? null;
}

function passMessage(stepId: string): BilingualMessage {
  if (stepId === "step_prd") {
    return msg("PRD passed Skeleton Spike artifact check.", "PRD 已通过 Skeleton Spike 产物检查。");
  }
  return msg(`Step ${stepId} passed the artifact check.`, `step ${stepId} 已通过步骤产物检查。`);
}

function blockedSectionsMessage(stepId: string, missing: readonly string[]): BilingualMessage {
  if (stepId === "step_prd") {
    // Plan §4.4.21 + user §X verbatim — "only Scenarios missing" gets a
    // singular bilingual message that the existing CLI/integration tests
    // pin against. Other step_prd shapes fall through to the generic
    // PRD-flavoured pluralisation below.
    if (missing.length === 1 && missing[0] === "section_scenarios") {
      return msg(
        "PRD is missing required section: Scenarios.",
        "PRD 缺少必填章节：Scenarios｜使用场景。",
      );
    }
    return msg(
      `PRD is missing required sections: ${missing.join(", ")}.`,
      `PRD 缺少必填章节：${missing.join("、")}。`,
    );
  }
  return msg(
    `Step ${stepId} is missing required sections: ${missing.join(", ")}.`,
    `step ${stepId} 缺少必填章节：${missing.join("、")}。`,
  );
}

function artifactMissingMessage(
  stepId: string,
  artifactPath: string,
  docHint: string | null,
): BilingualMessage {
  if (stepId === "step_prd") {
    return msg(
      `PRD not found at ${artifactPath}. Run \`ocn doc create prd\` first.`,
      `未找到 PRD：${artifactPath}，请先执行 \`ocn doc create prd\`。`,
    );
  }
  if (docHint !== null) {
    return msg(
      `Artifact for step ${stepId} not found at ${artifactPath}. Run \`ocn doc create ${docHint}\` first.`,
      `step ${stepId} 的产物未找到：${artifactPath}，请先执行 \`ocn doc create ${docHint}\`。`,
    );
  }
  return msg(
    `Artifact for step ${stepId} not found at ${artifactPath}.`,
    `step ${stepId} 的产物未找到：${artifactPath}。`,
  );
}

function notApplicableMessage(stepId: string): BilingualMessage {
  return msg(
    `Step ${stepId} has no required artifact (not applicable).`,
    `step ${stepId} 无需产物（不适用）。`,
  );
}

export async function checkCurrentArtifact(opts: CheckOptions): Promise<CommandResult<CheckData>> {
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
  const stepId = state.currentStepId;
  const stateId = state.currentStateId;

  if (!isKnownStep(profile, stepId)) {
    return blocked(
      "ERR_STATE_MACHINE",
      msg(
        `Unknown step ${stepId} — not present in the active SOP profile.`,
        `未知 step ${stepId}：当前 SOP profile 未定义该 step。`,
      ),
    );
  }

  const required = profile.requiredSectionsForStep(stepId);
  const relativeArtifactPath = profile.artifactPathForStep(stepId);
  const artifactId = artifactIdForStep(stepId);

  const baseAuditCtx = {
    actor: "user" as const,
    source: "cli" as const,
    projectRoot: opts.cwd,
    currentStateId: stateId,
    currentStepId: stepId,
    command: "check",
  };

  // Step has no required artifact (e.g. state_build / state_verify stubs in
  // v1.0). Mirror runGate: emit gate_run + gate_passed and return ok with
  // status=not_applicable rather than blocking.
  if (relativeArtifactPath === null) {
    const data: CheckData = {
      artifactPath: "",
      status: "not_applicable",
      missingRequiredSectionIds: [],
    };
    const message = notApplicableMessage(stepId);
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        ...baseAuditCtx,
        eventType: "artifact_gate_run",
        result: "executed",
        message: msg(
          `Artifact gate executed for step ${stepId} (not applicable).`,
          `已对 step ${stepId} 执行步骤产物门禁检查（不适用）。`,
        ),
        relatedArtifactIds: [artifactId],
      }),
    );
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        ...baseAuditCtx,
        eventType: "artifact_gate_passed",
        result: "pass",
        message,
        relatedArtifactIds: [artifactId],
        data: { ...data },
      }),
    );
    return ok(message, data);
  }

  const artifactPath = join(opts.cwd, relativeArtifactPath);

  // Always emit gate_run first — record that a check was attempted regardless
  // of the eventual outcome. Exits-mid-check leave a single trail entry.
  await safeAudit(
    opts.cwd,
    createAuditEvent({
      ...baseAuditCtx,
      eventType: "artifact_gate_run",
      result: "executed",
      message: msg(
        `Artifact gate executed for ${artifactPath}.`,
        `已对 ${artifactPath} 执行步骤产物门禁检查。`,
      ),
      relatedArtifactIds: [artifactId],
      relatedPaths: [artifactPath],
    }),
  );

  const emitGateResult = async (
    eventType: Extract<AuditEvent["eventType"], "artifact_gate_blocked" | "artifact_gate_passed">,
    result: AuditEvent["result"],
    gateStatus: CheckStatus,
    missingRequiredSectionIds: readonly string[],
    message: AuditEvent["message"],
  ): Promise<void> => {
    await safeAudit(
      opts.cwd,
      createAuditEvent({
        ...baseAuditCtx,
        eventType,
        result,
        message,
        relatedArtifactIds: [artifactId],
        relatedPaths: [artifactPath],
        data: {
          artifactPath,
          status: gateStatus,
          missingRequiredSectionIds: [...missingRequiredSectionIds],
        },
      }),
    );
  };

  let content: string;
  try {
    content = await fs.readFile(artifactPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const missing = required.map((r) => r.id);
      const docHint = docTypeHintFromPath(relativeArtifactPath);
      const message = artifactMissingMessage(stepId, artifactPath, docHint);
      await emitGateResult("artifact_gate_blocked", "blocked", "blocked", missing, message);
      return blocked("ERR_ARTIFACT_INVALID", message, {
        artifactPath,
        status: "blocked",
        missingRequiredSectionIds: missing,
      } satisfies CheckData);
    }
    throw err;
  }

  const headings = parseHeadings(content);
  const gate = computeArtifactGateStatus({
    artifactPath: relativeArtifactPath,
    headings,
    required,
  });

  if (gate.status === "blocked") {
    const missing = gate.missingRequiredSectionIds;
    const message = blockedSectionsMessage(stepId, missing);
    await emitGateResult("artifact_gate_blocked", "blocked", "blocked", missing, message);
    return blocked("ERR_ARTIFACT_INVALID", message, {
      artifactPath,
      status: "blocked",
      missingRequiredSectionIds: missing,
    } satisfies CheckData);
  }

  const message = passMessage(stepId);
  await emitGateResult(
    "artifact_gate_passed",
    "pass",
    gate.status,
    gate.missingRequiredSectionIds,
    message,
  );
  return ok(message, {
    artifactPath,
    status: gate.status,
    missingRequiredSectionIds: gate.missingRequiredSectionIds,
  } satisfies CheckData);
}
