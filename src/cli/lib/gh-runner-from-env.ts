// Shared CLI helper: pickGhRunnerFromEnv (PR-B / H5).
//
// This module is the single source of truth for the test-only fixture-runner
// injection mechanism. The env-var read is gated behind `NODE_ENV === "test"`
// or `OCN_TEST_MODE === "1"` so production binaries cannot be redirected
// through fixture data even if the env var leaks into the runtime
// environment. Each fixture runner ALSO calls `isReadOnlyInvocation` before
// consulting fixtures so a buggy fixture file describing a write call is
// refused at the runner boundary regardless of fixture content.
//
// All six CLI commands (`exec`, `github`, `evidence`, `next-prompt`,
// `verify`, `verdict`) delegate to `pickGhRunnerFromEnv()` so the rules below
// apply uniformly.

import { readFileSync } from "node:fs";
import {
  defaultGhRunner,
  isReadOnlyInvocation,
  type GhRunner,
} from "../../core/execution-navigator/github-pr-runner.js";

export interface FixtureEntry {
  readonly args: readonly string[];
  readonly ok?: boolean;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly code?: "ENOENT" | "EXIT_NONZERO" | "OTHER";
  readonly exitCode?: number;
  readonly message?: string;
}

interface FixtureFile {
  readonly entries: readonly FixtureEntry[];
}

// Build a fixture-driven GhRunner. Defence-in-depth: each `run` invocation
// validates `isReadOnlyInvocation(args)` before consulting the fixture, so a
// buggy fixture describing a write call is refused at the runner boundary.
export function createFixtureRunner(fixturePath: string): GhRunner {
  const raw = readFileSync(fixturePath, "utf8");
  const parsed = JSON.parse(raw) as FixtureFile;
  return {
    async run(args: readonly string[]) {
      if (!isReadOnlyInvocation(args)) {
        return {
          ok: false as const,
          code: "OTHER" as const,
          message: "refused: gh runner only permits read-only subcommands",
        };
      }
      const match = parsed.entries.find(
        (e) => e.args.length === args.length && e.args.every((a, i) => a === args[i]),
      );
      if (match === undefined) {
        return {
          ok: false as const,
          code: "OTHER" as const,
          message: `fixture-runner: no entry for ${args.join(" ")}`,
        };
      }
      if (match.ok === false) {
        const errorEntry: {
          ok: false;
          code: "ENOENT" | "EXIT_NONZERO" | "OTHER";
          message: string;
          stdout?: string;
          stderr?: string;
          exitCode?: number;
        } = {
          ok: false,
          code: match.code ?? "EXIT_NONZERO",
          message: match.message ?? "fixture-runner failure",
        };
        if (match.stdout !== undefined) errorEntry.stdout = match.stdout;
        if (match.stderr !== undefined) errorEntry.stderr = match.stderr;
        if (match.exitCode !== undefined) errorEntry.exitCode = match.exitCode;
        return errorEntry;
      }
      return {
        ok: true as const,
        stdout: match.stdout ?? "",
        stderr: match.stderr ?? "",
      };
    },
  };
}

// Returns a fixture-driven runner ONLY when both:
//   - NODE_ENV === "test" OR OCN_TEST_MODE === "1"
//   - OCN_TEST_GH_RUNNER_FIXTURES points at a readable JSON file
// Otherwise returns `defaultGhRunner()`. Production binaries always fall
// through to `defaultGhRunner()` regardless of any env-var setting.
export function pickGhRunnerFromEnv(): GhRunner {
  if (process.env["NODE_ENV"] !== "test" && process.env["OCN_TEST_MODE"] !== "1") {
    return defaultGhRunner();
  }
  const fixturePath = process.env["OCN_TEST_GH_RUNNER_FIXTURES"];
  if (typeof fixturePath !== "string" || fixturePath.length === 0) {
    return defaultGhRunner();
  }
  return createFixtureRunner(fixturePath);
}
