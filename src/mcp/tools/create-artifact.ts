import { z } from "zod";
import { createArtifact, type CreateArtifactData } from "../../core/doc.js";
import { msg } from "../../core/i18n.js";
import { validateInitializedProjectRoot } from "../../core/security/project-root.js";
import { mcpBlocked, mcpFromCommandResult, type MCPToolResult } from "../result.js";

// SOP 0.2.0 PR 4 (DEC-023) — runtime cutover. The MCP `create_artifact`
// schema previously enumerated only the 5 ids that 0.1.0 ran with. With
// 0.2.0 as the active runtime profile, all 19 wired artifact ids must be
// creatable via MCP. The widening is an additive parameter change only —
// the tool name, parameter shape, and response shape are unchanged.
export const createArtifactInputShape = {
  projectRoot: z.string().min(1),
  artifactType: z
    .enum([
      "project-brief",
      "scope",
      "prd",
      "acceptance-criteria",
      "technical-architecture",
      "information-architecture",
      "data-model",
      "api-contract",
      "test-strategy",
      "mvp-plan",
      "build-plan",
      "implementation-log",
      "change-evidence",
      "integration-notes",
      "verification-report",
      "acceptance-mapping",
      "failure-fix-log",
      "regression-evidence",
      "final-build-verdict",
    ])
    .describe("One of the supported SOP 0.2.0 template ids (00-18)."),
  overwrite: z.boolean().optional(),
};
const createArtifactSchema = z.object(createArtifactInputShape);

export const createArtifactTool = {
  name: "navigator.create_artifact",
  description:
    "Create a SOP 0.2.0 artifact (00 project-brief through 18 final-build-verdict) from the bundled bilingual template.",
  inputShape: createArtifactInputShape,
  async handler(args: unknown): Promise<MCPToolResult<CreateArtifactData>> {
    try {
      const parsed = createArtifactSchema.parse(args);
      const validation = await validateInitializedProjectRoot(parsed.projectRoot);
      if (!validation.ok) {
        return mcpBlocked(validation.error.code, validation.error.message, {
          reason: validation.error.reason,
        });
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
