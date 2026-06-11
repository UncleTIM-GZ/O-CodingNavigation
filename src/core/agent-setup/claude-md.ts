import { promises as fs } from "node:fs";
import { Paths } from "../paths.js";
import { writeArtifact } from "../artifact/template-writer.js";
import type { SetupFileAction } from "./settings-merge.js";

// AM-006 — ensure the project CLAUDE.md imports the OCN governance contract.
// Append-once: never rewrite or reorder existing user content.

export const OCN_IMPORT_LINE = "@.claude/ocn.md";
export const OCN_IMPORT_MARKER = "<!-- OCN agent integration (ocn agent setup) -->";

const MINIMAL_CLAUDE_MD = `# CLAUDE.md

${OCN_IMPORT_MARKER}
${OCN_IMPORT_LINE}
`;

export async function ensureClaudeMdImport(cwd: string): Promise<SetupFileAction> {
  const file = Paths.projectClaudeMd(cwd);
  let existing: string | null = null;
  try {
    existing = await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  if (existing === null) {
    await writeArtifact(file, MINIMAL_CLAUDE_MD, true);
    return "created";
  }
  const hasImport = existing.split("\n").some((line) => line.trim() === OCN_IMPORT_LINE);
  if (hasImport) return "skipped";

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  const appended = `${existing}${separator}${OCN_IMPORT_MARKER}\n${OCN_IMPORT_LINE}\n`;
  await writeArtifact(file, appended, true);
  return "updated";
}
