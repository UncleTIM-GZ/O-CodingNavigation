import { promises as fs } from "node:fs";
import { Paths } from "../paths.js";
import { OCN_IMPORT_LINE, OCN_IMPORT_MARKER } from "./claude-md.js";
import { unmergeClaudeSettings } from "./settings-merge.js";

// `ocn stop` teardown — the inverse of `setupAgentIntegration` (setup.ts).
// Uninstalls the four injected Claude Code surfaces, reusing the exact markers
// setup wrote so removal is surgical:
//   .claude/ocn.md               — OCN-owned file → deleted
//   .claude/commands/ocn-next.md — OCN-owned file → deleted
//   .claude/settings.json        — OCN hook groups + OCN_ACTOR env stripped
//   CLAUDE.md                    — the `@.claude/ocn.md` import line removed
// Idempotent (missing files → skipped) and fail-safe (malformed settings.json
// is left untouched). User content is never rewritten or reordered.

export type TeardownFileAction = "removed" | "updated" | "skipped";

export interface TeardownFile {
  readonly path: string;
  readonly action: TeardownFileAction;
}

export interface TeardownData {
  readonly command: "agent.teardown";
  readonly files: readonly TeardownFile[];
}

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function deleteOwnedFile(path: string): Promise<TeardownFileAction> {
  try {
    await fs.unlink(path);
    return "removed";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "skipped";
    throw err;
  }
}

async function stripSettings(path: string): Promise<TeardownFileAction> {
  const existing = await readFileOrNull(path);
  const result = unmergeClaudeSettings(existing);
  // Malformed / absent → leave the file exactly as-is (fail-safe).
  if (!result.ok || result.action === "skipped") return "skipped";
  await fs.writeFile(path, result.content, "utf8");
  return "updated";
}

/** Drop the OCN import marker + `@.claude/ocn.md` line; keep all user content. */
function removeOcnImport(text: string): string | null {
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const t = line.trim();
    return t !== OCN_IMPORT_MARKER && t !== OCN_IMPORT_LINE;
  });
  if (kept.length === lines.length) return null;
  return kept.join("\n");
}

async function stripClaudeMdImport(path: string): Promise<TeardownFileAction> {
  const existing = await readFileOrNull(path);
  if (existing === null) return "skipped";
  const next = removeOcnImport(existing);
  if (next === null) return "skipped";
  await fs.writeFile(path, next, "utf8");
  return "updated";
}

export interface TeardownOptions {
  readonly cwd: string;
}

export async function teardownAgentIntegration(opts: TeardownOptions): Promise<TeardownData> {
  const files: TeardownFile[] = [
    { path: Paths.claudeOcnMd(opts.cwd), action: await deleteOwnedFile(Paths.claudeOcnMd(opts.cwd)) },
    {
      path: Paths.claudeOcnNextCommand(opts.cwd),
      action: await deleteOwnedFile(Paths.claudeOcnNextCommand(opts.cwd)),
    },
    {
      path: Paths.claudeSettings(opts.cwd),
      action: await stripSettings(Paths.claudeSettings(opts.cwd)),
    },
    {
      path: Paths.projectClaudeMd(opts.cwd),
      action: await stripClaudeMdImport(Paths.projectClaudeMd(opts.cwd)),
    },
  ];
  return { command: "agent.teardown", files };
}
