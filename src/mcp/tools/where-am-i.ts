import { z } from "zod";
import { getStatus, type StatusData } from "../../core/status.js";
import { msg } from "../../core/i18n.js";
import { validateProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const whereAmIInputShape = {
  projectRoot: z.string().min(1),
};
const whereAmISchema = z.object(whereAmIInputShape);

export const whereAmI = {
  name: "navigator.where_am_i",
  description: "Read-only: returns the current project state, step, and next action.",
  inputShape: whereAmIInputShape,
  async handler(args: unknown): Promise<MCPToolResult<StatusData>> {
    try {
      const parsed = whereAmISchema.parse(args);
      const validation = await validateProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message);
      }
      const result = await getStatus({ cwd: validation.projectRoot });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `where_am_i failed: ${(err as Error).message}`,
          `where_am_i 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
