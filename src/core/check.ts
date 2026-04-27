import { promises as fs } from "node:fs";
import type { ArtifactGateStatus } from "../types/artifact.js";
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
  let content: string;
  try {
    content = await fs.readFile(artifactPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `PRD not found at ${artifactPath}. Run \`ocn doc create prd\` first.`,
          `未找到 PRD：${artifactPath}，请先执行 \`ocn doc create prd\`。`,
        ),
        {
          artifactPath,
          status: "blocked",
          missingRequiredSectionIds: required.map((r) => r.id),
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
      return blocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          "PRD is missing required section: Scenarios.",
          "PRD 缺少必填章节：Scenarios｜使用场景。",
        ),
        {
          artifactPath,
          status: "blocked",
          missingRequiredSectionIds: missing,
        },
      );
    }

    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `PRD is missing required sections: ${missing.join(", ")}.`,
        `PRD 缺少必填章节：${missing.join("、")}。`,
      ),
      {
        artifactPath,
        status: "blocked",
        missingRequiredSectionIds: missing,
      },
    );
  }

  return ok(
    msg(
      "PRD passed Skeleton Spike artifact check.",
      "PRD 已通过 Skeleton Spike 产物检查。",
    ),
    {
      artifactPath,
      status: gate.status,
      missingRequiredSectionIds: gate.missingRequiredSectionIds,
    },
  );
}
