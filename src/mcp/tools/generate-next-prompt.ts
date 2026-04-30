import { z } from "zod";
import { generateNextPrompt, type NextPromptData } from "../../core/prompt/generate-next-prompt.js";
import { msg } from "../../core/i18n.js";
import { validateInitializedProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const generateNextPromptInputShape = {
  projectRoot: z.string().min(1),
};
const generateNextPromptSchema = z.object(generateNextPromptInputShape);

export const generateNextPromptTool = {
  name: "navigator.generate_next_prompt",
  description:
    "Read-only: build a concrete next-step prompt for the current step, including required sections, AI Governance Reminder, Uncertainty Policy, and the Step Artifact Gate Self-check rule.",
  inputShape: generateNextPromptInputShape,
  async handler(args: unknown): Promise<MCPToolResult<NextPromptData>> {
    try {
      const parsed = generateNextPromptSchema.parse(args);
      const validation = await validateInitializedProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message, {
          reason: validation.error.reason,
        });
      }
      const result = await generateNextPrompt({ cwd: validation.projectRoot });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_IO_OR_CONFIG",
        msg(
          `generate_next_prompt failed: ${(err as Error).message}`,
          `generate_next_prompt 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
