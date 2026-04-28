import { promises as fs } from "node:fs";
import type { ArtifactGateStatus } from "../types/artifact.js";
import type { AuditEvent } from "../types/audit.js";
import type { CommandResult } from "../types/result.js";
import type { ProjectState } from "../types/state.js";
import { Paths } from "./paths.js";
import { computeArtifactGateStatus } from "./artifact/gate-status.js";
import { parseHeadings } from "./artifact/markdown-parser.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { loadSopProfile } from "./sop/loader.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "./state/state-store.js";
import { createAuditEvent, safeAudit } from "./audit/index.js";

export interface CheckOptions {
  readonly cwd: string;
}

export interface CheckData {
  readonly artifactPath: string;
  readonly status: ArtifactGateStatus["status"];
  readonly missingRequiredSectionIds: readonly string[];
}

export async function checkCurrentArtifact(
  opts: CheckOptions,
): Promise<CommandResult<CheckData>> {
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
  const required = profile.requiredSectionsForStep(state.currentStepId);

  if (state.currentStepId !== "step_prd") {
    return blocked(
      "ERR_STATE_MACHINE",
      msg(
        `Skeleton Spike check only handles step_prd; current step is ${state.currentStepId}.`,
        `Skeleton Spike 仅处理 step_prd，当前 step 为 ${state.currentStepId}。`,
      ),
      {
        artifactPath: Paths.prdFile(opts.cwd),
        status: "blocked",
        missingRequiredSectionIds: [],
      },
    );
  }

  const artifactPath = Paths.prdFile(opts.cwd);

  // Emit gate_run before reading the file — record that a check was attempted
  // regardless of outcome.
  const baseAuditCtx = {
    actor: "user" as const,
    source: "cli" as const,
    projectRoot: opts.cwd,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
    command: "check",
  };
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
      relatedArtifactIds: ["artifact_prd"],
      relatedPaths: [artifactPath],
    }),
  );

  const emitGateResult = async (
    eventType: Extract<
      AuditEvent["eventType"],
      "artifact_gate_blocked" | "artifact_gate_passed"
    >,
    result: AuditEvent["result"],
    gateStatus: ArtifactGateStatus["status"],
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
        relatedArtifactIds: ["artifact_prd"],
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
      await emitGateResult(
        "artifact_gate_blocked",
        "blocked",
        "blocked",
        missing,
        msg(
          `PRD not found at ${artifactPath}.`,
          `未找到 PRD：${artifactPath}。`,
        ),
      );
      return blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `PRD not found at ${artifactPath}. Run \`ocn doc create prd\` first.`,
          `未找到 PRD：${artifactPath}，请先执行 \`ocn doc create prd\`。`,
        ),
        {
          artifactPath,
          status: "blocked",
          missingRequiredSectionIds: missing,
        },
      );
    }
    throw err;
  }

  const headings = parseHeadings(content);
  const gate = computeArtifactGateStatus({ artifactPath, headings, required });

  if (gate.status === "blocked") {
    const missing = gate.missingRequiredSectionIds;

    // Special case (plan §4.4.21 + user §X verbatim): only Scenarios missing.
    if (missing.length === 1 && missing[0] === "section_scenarios") {
      const message = msg(
        "PRD is missing required section: Scenarios.",
        "PRD 缺少必填章节：Scenarios｜使用场景。",
      );
      await emitGateResult(
        "artifact_gate_blocked",
        "blocked",
        "blocked",
        missing,
        message,
      );
      return blocked(
        "ERR_ARTIFACT_INVALID",
        message,
        {
          artifactPath,
          status: "blocked",
          missingRequiredSectionIds: missing,
        },
      );
    }

    const message = msg(
      `PRD is missing required sections: ${missing.join(", ")}.`,
      `PRD 缺少必填章节：${missing.join("、")}。`,
    );
    await emitGateResult("artifact_gate_blocked", "blocked", "blocked", missing, message);
    return blocked(
      "ERR_ARTIFACT_INVALID",
      message,
      {
        artifactPath,
        status: "blocked",
        missingRequiredSectionIds: missing,
      },
    );
  }

  const passMessage = msg(
    "PRD passed Skeleton Spike artifact check.",
    "PRD 已通过 Skeleton Spike 产物检查。",
  );
  await emitGateResult(
    "artifact_gate_passed",
    "pass",
    gate.status,
    gate.missingRequiredSectionIds,
    passMessage,
  );
  return ok(passMessage, {
    artifactPath,
    status: gate.status,
    missingRequiredSectionIds: gate.missingRequiredSectionIds,
  });
}
