import { z } from "zod";
import { createArtifact, type CreateArtifactData } from "../../core/doc.js";
import { msg } from "../../core/i18n.js";
import { validateProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

export const createArtifactInputShape = {
  projectRoot: z.string().min(1),
  artifactType: z
    .enum(["project-brief", "scope", "prd", "acceptance-criteria", "technical-architecture"])
    .describe("One of the supported template types."),
  overwrite: z.boolean().optional(),
};
const createArtifactSchema = z.object(createArtifactInputShape);

export const createArtifactTool = {
  name: "navigator.create_artifact",
  description:
    "Create an artifact (project-brief / scope / prd / acceptance-criteria / technical-architecture) from the bundled bilingual template.",
  inputShape: createArtifactInputShape,
  async handler(args: unknown): Promise<MCPToolResult<CreateArtifactData>> {
    try {
      const parsed = createArtifactSchema.parse(args);
      const validation = await validateProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message);
      }
      const result = await createArtifact({
        cwd: validation.projectRoot,
        type: parsed.artifactType,
        ...(parsed.overwrite !== undefined ? { overwrite: parsed.overwrite } : {}),
      });
      return mcpFromCommandResult(result);
    } catch (err) {
      return mcpBlocked(
        "ERR_ARTIFACT_INVALID",
        msg(
          `create_artifact failed: ${(err as Error).message}`,
          `create_artifact 失败：${(err as Error).message}`,
        ),
      );
    }
  },
} as const;
