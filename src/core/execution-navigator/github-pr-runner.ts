// MVP 2 — gh CLI runner abstraction (DEC-024 PR 3).
//
// The runner exists so unit tests can inject fixture stdout / stderr without
// spawning a real `gh` process. The CLI command and the orchestrator both
// take a runner; tests pass a fake one.
//
// All real spawns are read-only `gh` queries. The runner is constructed
// without shell access; arguments go through execFile's argv.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// gh stdout buffer ceiling. Large PRs with many files can produce > 1MB of
// JSON; we bump the ceiling rather than silently truncate.
const GH_MAX_BUFFER = 16 * 1024 * 1024;

export interface GhInvocationOk {
  readonly ok: true;
  readonly stdout: string;
  readonly stderr: string;
}

export interface GhInvocationError {
  readonly ok: false;
  readonly code: "ENOENT" | "EXIT_NONZERO" | "OTHER";
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly message: string;
}

export type GhInvocation = GhInvocationOk | GhInvocationError;

// Runner contract. A test fake implements this and returns canned responses.
export interface GhRunner {
  run(args: readonly string[]): Promise<GhInvocation>;
}

// Read-only allowlist of `gh` subcommand verbs. The runner refuses anything
// outside this list to keep the no-mutation invariant enforceable from one
// place. Matched against argv[0]; sub-verbs (e.g. `pr view` vs `pr edit`)
// are validated explicitly via this list of leading-pair allowlists.
const GH_READONLY_LEADING_PAIRS: readonly (readonly [string, string])[] = Object.freeze([
  ["pr", "view"],
  ["auth", "status"],
]);

// Exported so CLI fixture runners (test-only) can apply the same defence-in-
// depth check before consulting fixtures: even a buggy fixture file that
// describes a write call must be refused at the runner boundary. PR-B will
// move this into a shared module; for PR-A we keep it co-located with
// `defaultGhRunner` so callers stay locked to the same allowlist.
export function isReadOnlyInvocation(args: readonly string[]): boolean {
  if (args.length < 2) return false;
  const a = args[0];
  const b = args[1];
  for (const [x, y] of GH_READONLY_LEADING_PAIRS) {
    if (a === x && b === y) return true;
  }
  return false;
}

// Default runner. Spawns `gh` via execFile (no shell). Refuses non-read-only
// argv as a defence-in-depth check.
export function defaultGhRunner(): GhRunner {
  return {
    async run(args: readonly string[]): Promise<GhInvocation> {
      if (!isReadOnlyInvocation(args)) {
        return {
          ok: false,
          code: "OTHER",
          message: "refused: gh runner only permits read-only subcommands",
        };
      }
      try {
        const { stdout, stderr } = await execFileP("gh", [...args], {
          encoding: "utf8",
          maxBuffer: GH_MAX_BUFFER,
        });
        return { ok: true, stdout, stderr };
      } catch (err) {
        const e = err as {
          code?: string | number;
          stderr?: string;
          stdout?: string;
          message?: string;
        };
        if (e.code === "ENOENT") {
          return {
            ok: false,
            code: "ENOENT",
            message: "gh binary not found",
          };
        }
        const exitCode = typeof e.code === "number" ? e.code : undefined;
        return {
          ok: false,
          code: "EXIT_NONZERO",
          ...(exitCode !== undefined ? { exitCode } : {}),
          ...(typeof e.stderr === "string" ? { stderr: e.stderr } : {}),
          ...(typeof e.stdout === "string" ? { stdout: e.stdout } : {}),
          message: e.message ?? "gh invocation failed",
        };
      }
    },
  };
}
