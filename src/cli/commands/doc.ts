import type { Command } from "commander";
import { createArtifact } from "../../core/doc.js";
import { outputResult } from "../output.js";

export function registerDocCommand(program: Command): void {
  const doc = program.command("doc").description("Manage OCN artifacts");
  doc
    .command("create")
    .description("Create an artifact from its bundled template")
    .argument(
      "<type>",
      "Artifact type: project-brief | scope | prd | acceptance-criteria | technical-architecture",
    )
    .option("--overwrite", "Overwrite an existing file", false)
    .option("--json", "Emit machine-readable JSON CommandResult", false)
    .action(async (type: string, rawOpts: { overwrite: boolean; json: boolean }) => {
      const result = await createArtifact({
        cwd: process.cwd(),
        type,
        overwrite: rawOpts.overwrite,
      });
      outputResult(result, { json: rawOpts.json });
    });
}
