import { z } from "zod";
import { runGate } from "../../core/gate/gate-runner.js";
import { msg } from "../../core/i18n.js";
import { validateInitializedProjectRoot } from "../../core/security/project-root.js";
import type { GateResult } from "../../types/state-machine.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const runGateInputShape = {
  projectRoot: z.string().min(1),
};
const runGateSchema = z.object(runGateInputShape);

export const runGateTool = {
  name: "navigator.run_gate",
  description:
    "Run the artifact gate against the current step (read-only — does NOT mutate state, " +
    "and does NOT execute project build/test commands; command-backed readiness checks " +
    "report UNKNOWN over MCP).",
  inputShape: runGateInputShape,
  async handler(args: unknown): Promise<MCPToolResult<GateResult>> {
    try {
      const parsed = runGateSchema.parse(args);
      const validation = await validateInitializedProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message, {
          reason: validation.error.reason,
        });
      }
      const result = await runGate({
        cwd: validation.projectRoot,
        actor: "ai_agent",
        source: "core",
        command: "mcp.run_gate",
        // W1 — MCP is read-only: never execute the project's shell commands.
        executeCommands: false,
      });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_GATE_FAILED",
        msg(
          `run_gate failed: ${(err as Error).message}`,
          `run_gate 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
