import { z } from "zod";
import { detectSopVersion, type DetectSopVersionData } from "../../core/sop/detect-version.js";
import { msg } from "../../core/i18n.js";
import { validateInitializedProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const detectSopVersionInputShape = {
  projectRoot: z.string().min(1),
};
const detectSopVersionSchema = z.object(detectSopVersionInputShape);

export const detectSopVersionTool = {
  name: "navigator.detect_sop_version",
  description:
    "Read-only: compare the project's locked SOP profile version against the currently-bundled version.",
  inputShape: detectSopVersionInputShape,
  async handler(args: unknown): Promise<MCPToolResult<DetectSopVersionData>> {
    try {
      const parsed = detectSopVersionSchema.parse(args);
      const validation = await validateInitializedProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message, {
          reason: validation.error.reason,
        });
      }
      const result = await detectSopVersion({ cwd: validation.projectRoot });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_SOP_VERSION",
        msg(
          `detect_sop_version failed: ${(err as Error).message}`,
          `detect_sop_version 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
