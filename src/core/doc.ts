import { join } from "node:path";
import type { CommandResult } from "../types/result.js";
import { blocked, ok } from "./result.js";
import { msg } from "./i18n.js";
import { FileExistsError, writeArtifact } from "./artifact/template-writer.js";
import { type DocType, DOC_TYPES, getTemplate, isDocType } from "./templates/index.js";
import { createAuditEvent, safeAudit } from "./audit/index.js";

export type { DocType } from "./templates/index.js";

export interface CreateArtifactOptions {
  readonly cwd: string;
  readonly type: string;
  readonly overwrite?: boolean;
}

export interface CreateArtifactData {
  readonly artifactPath: string;
  readonly type: DocType;
}

// PR #4 — `ocn doc create <type>` accepts 5 doc types via the template
// registry. PR #1's `prd` path is preserved exactly (back-compat).
export async function createArtifact(
  opts: CreateArtifactOptions,
): Promise<CommandResult<CreateArtifactData>> {
  if (!isDocType(opts.type)) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        `Unsupported doc type '${opts.type}'. Supported: ${DOC_TYPES.join(", ")}.`,
        `不支持的 doc 类型 '${opts.type}'。支持：${DOC_TYPES.join("、")}。`,
      ),
      { supportedTypes: [...DOC_TYPES] },
    );
  }

  const entry = getTemplate(opts.type);
  const artifactPath = join(opts.cwd, entry.relativePath);

  try {
    await writeArtifact(artifactPath, entry.template, opts.overwrite ?? false);
  } catch (err) {
    if (err instanceof FileExistsError) {
      return blocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `${entry.type} already exists at ${err.filePath}. Use --overwrite to replace it.`,
          `${entry.type} 已存在：${err.filePath}。使用 --overwrite 覆盖。`,
        ),
        { artifactPath: err.filePath, type: entry.type },
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
        `Created ${entry.type} template at ${artifactPath}.`,
        `已创建 ${entry.type} 模板：${artifactPath}。`,
      ),
      relatedArtifactIds: [entry.artifactId],
      relatedPaths: [artifactPath],
      data: { artifactType: entry.type, overwrite: opts.overwrite ?? false },
    }),
  );

  return ok(
    msg(
      `Created ${entry.type} template at ${artifactPath}.`,
      `已创建 ${entry.type} 模板：${artifactPath}。`,
    ),
    { artifactPath, type: entry.type },
  );
}
