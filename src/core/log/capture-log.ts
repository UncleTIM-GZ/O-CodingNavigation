import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { msg } from "../i18n.js";
import { blocked, ok } from "../result.js";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
} from "../state/state-store.js";

// PR #5 — `navigator.capture_log` MCP tool calls this. Minimal append-only
// markdown for dev/research; decision is REJECTED at MCP boundary
// (CLAUDE.md §4.7 — decisions are pull-mode by humans).

export type CaptureLogType = "dev" | "research" | "decision";

export interface CaptureLogOptions {
  readonly cwd: string;
  readonly type: CaptureLogType;
  readonly message: string;
  readonly source?: "cli" | "core" | "test";
  readonly actor?: "user" | "system" | "ai_agent";
  readonly command?: string;
  readonly correlationId?: string;
}

export interface CaptureLogData {
  readonly artifactPath: string;
  readonly type: Exclude<CaptureLogType, "decision">;
}

const PATHS: Readonly<Record<Exclude<CaptureLogType, "decision">, string>> = {
  dev: "docs/19-dev-log.md",
  research: "docs/18-research-log.md",
};

const HEADERS: Readonly<Record<Exclude<CaptureLogType, "decision">, string>> = {
  dev: `# Dev Log｜开发日志

> Append-only. Each entry is one developer-or-agent log captured via
> \`ocn log\` (CLI) or \`navigator.capture_log\` (MCP, type=dev).

`,
  research: `# Research Log｜研究日志

> Append-only. Each entry is one research note captured via
> \`ocn log --type research\` (CLI) or \`navigator.capture_log\` (MCP, type=research).

`,
};

function nowIsoUtcZ(): string {
  return new Date().toISOString();
}

export async function captureLog(
  opts: CaptureLogOptions,
): Promise<CommandResult<CaptureLogData>> {
  // type=decision is REJECTED unconditionally. PR #5 §V item 5.
  if (opts.type === "decision") {
    return blocked(
      "ERR_GATE_FAILED",
      msg(
        "MCP tools cannot capture decision. Use CLI decision flow.",
        "MCP 工具不能写入决策。请使用 CLI 决策流程。",
      ),
      { type: opts.type },
    );
  }

  // Validate state.json exists — capture_log requires an initialized project
  // so the audit trail has a project to attach to.
  try {
    await readState(opts.cwd);
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

  const trimmed = opts.message.trim();
  if (trimmed.length === 0) {
    return blocked(
      "ERR_ARTIFACT_INVALID",
      msg(
        "Log message must be non-empty.",
        "日志内容不能为空。",
      ),
    );
  }

  const relativePath = PATHS[opts.type];
  const absolutePath = join(opts.cwd, relativePath);
  await fs.mkdir(dirname(absolutePath), { recursive: true });

  // Header on first write (mirrors audit-markdown.ts §15.4 race-avoidance pattern).
  try {
    const handle = await fs.open(absolutePath, "wx");
    try {
      await handle.writeFile(HEADERS[opts.type], "utf8");
    } finally {
      await handle.close();
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }

  const entry = `## ${nowIsoUtcZ()}\n\n${trimmed}\n\n`;
  await fs.appendFile(absolutePath, entry, "utf8");

  // Audit emission: minimal — reuse `artifact_created` with subType in data.
  // A dedicated `log_captured` event type is reserved for a future PR.
  await safeAudit(
    opts.cwd,
    createAuditEvent({
      eventType: "artifact_created",
      result: "success",
      actor: opts.actor ?? "ai_agent",
      source: opts.source ?? "core",
      projectRoot: opts.cwd,
      command: opts.command ?? "capture-log",
      ...(opts.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
      message: msg(
        `Captured ${opts.type} log entry at ${relativePath}.`,
        `已写入 ${opts.type} 日志：${relativePath}。`,
      ),
      relatedPaths: [absolutePath],
      data: { subType: `log-${opts.type}`, length: trimmed.length },
    }),
  );

  return ok(
    msg(
      `Captured ${opts.type} log entry at ${absolutePath}.`,
      `已写入 ${opts.type} 日志：${absolutePath}。`,
    ),
    { artifactPath: absolutePath, type: opts.type },
  );
}
