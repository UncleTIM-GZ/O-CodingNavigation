import type { CommandResult } from "../types/result.js";
import { Paths } from "./paths.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { FileExistsError, writeArtifact } from "./artifact/template-writer.js";
import { prdTemplate } from "./templates/prd.js";
import { createAuditEvent, safeAudit } from "./audit/index.js";

export type DocType = "prd";

export interface CreateArtifactOptions {
  readonly cwd: string;
  readonly type: string;
  readonly overwrite?: boolean;
}

export interface CreateArtifactData {
  readonly artifactPath: string;
  readonly type: DocType;
}

export async function createArtifact(
  opts: CreateArtifactOptions,
): Promise<CommandResult<CreateArtifactData>> {
  if (opts.type !== "prd") {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `Skeleton Spike supports only doc type 'prd'. Got: '${opts.type}'.`,
        `Skeleton Spike 仅支持 doc 类型 'prd'，收到: '${opts.type}'。`,
      ),
    );
  }
  const artifactPath = Paths.prdFile(opts.cwd);
  try {
    await writeArtifact(artifactPath, prdTemplate, opts.overwrite ?? false);
  } catch (err) {
    if (err instanceof FileExistsError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `PRD already exists at ${err.filePath}. Use --overwrite to replace it.`,
          `PRD 已存在：${err.filePath}。使用 --overwrite 覆盖。`,
        ),
        { artifactPath: err.filePath },
      );
    }
    throw err;
  }

  // Audit emission — best-effort, never fails the command.
  await safeAudit(
    opts.cwd,
    createAuditEvent({
      eventType: "artifact_created",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: opts.cwd,
      command: "doc.create",
      message: msg(
        `Created PRD template at ${artifactPath}.`,
        `已创建 PRD 模板：${artifactPath}。`,
      ),
      relatedArtifactIds: ["artifact_prd"],
      relatedPaths: [artifactPath],
      data: { artifactType: "prd", overwrite: opts.overwrite ?? false },
    }),
  );

  return ok(
    msg(
      `Created PRD template at ${artifactPath}.`,
      `已创建 PRD 模板：${artifactPath}。`,
    ),
    { artifactPath, type: "prd" },
  );
}
