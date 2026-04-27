import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Paths } from "../paths.js";
import { ProjectState } from "../../types/state.js";

// Skeleton Spike: simple read/write WITHOUT lock + backup + atomic-rename.
// Per CLAUDE.md §4.5 + plan §3.2 — Phase 2 will add the full safety wrapper.
// Document this temporary simplification in implementation-notes.md.

export class StateNotFoundError extends Error {
  constructor(public readonly file: string) {
    super(`state.json not found at ${file}`);
    this.name = "StateNotFoundError";
  }
}

export class StateInvalidError extends Error {
  constructor(
    public readonly file: string,
    public readonly issues: unknown,
  ) {
    super(`state.json invalid at ${file}`);
    this.name = "StateInvalidError";
  }
}

export async function readState(root: string): Promise<ProjectState> {
  const file = Paths.stateFile(root);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new StateNotFoundError(file);
    }
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new StateInvalidError(file, (err as Error).message);
  }
  const result = ProjectState.safeParse(parsed);
  if (!result.success) {
    throw new StateInvalidError(file, result.error.issues);
  }
  return result.data;
}

export async function writeState(root: string, state: ProjectState): Promise<void> {
  const file = Paths.stateFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}
