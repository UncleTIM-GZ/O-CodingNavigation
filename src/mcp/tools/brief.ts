import { z } from "zod";
import { generateBrief, type BriefData } from "../../core/brief.js";
import { msg } from "../../core/i18n.js";
import { validateProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const briefInputShape = {
  projectRoot: z.string().min(1),
};
const briefSchema = z.object(briefInputShape);

export const brief = {
  name: "navigator.brief",
  description:
    "Read-only: generates AI-resumption brief including state, governance reminder, and uncertainty policy.",
  inputShape: briefInputShape,
  async handler(args: unknown): Promise<MCPToolResult<BriefData>> {
    try {
      const parsed = briefSchema.parse(args);
      const validation = await validateProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message);
      }
      const result = await generateBrief({ cwd: validation.projectRoot });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_IO_OR_CONFIG",
        msg(`brief failed: ${(err as Error).message}`, `brief 失败：${(err as Error).message}`),
      );
    }
  },
} as const;
