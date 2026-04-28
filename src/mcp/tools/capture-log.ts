import { z } from "zod";
import { captureLog, type CaptureLogData } from "../../core/log/capture-log.js";
import { msg } from "../../core/i18n.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

// MCP rejects type=decision unconditionally per CLAUDE.md §4.7 and PR #5 §V item 5.
export const captureLogInputShape = {
  projectRoot: z.string().min(1),
  type: z.enum(["dev", "research", "decision"]),
  message: z.string().min(1),
};
const captureLogSchema = z.object(captureLogInputShape);

export const captureLogTool = {
  name: "navigator.capture_log",
  description:
    "Append a dev or research log entry. type='decision' is REJECTED via MCP — use the CLI decision flow.",
  inputShape: captureLogInputShape,
  async handler(args: unknown): Promise<MCPToolResult<CaptureLogData>> {
    try {
      const parsed = captureLogSchema.parse(args);
      const result = await captureLog({
        cwd: parsed.projectRoot,
        type: parsed.type,
        message: parsed.message,
        actor: "ai_agent",
        source: "core",
        command: "mcp.capture_log",
      });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `capture_log failed: ${(err as Error).message}`,
          `capture_log 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
