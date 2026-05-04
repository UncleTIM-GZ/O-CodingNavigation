// MVP 1 — local git evidence reader for `ocn exec status` (DEC-024 PR 2).
//
// Read-only. The reader spawns `git` only with non-mutating subcommands and
// never invokes:
//   fetch / pull / push / checkout / add / commit / merge / rebase / reset /
//   clean / tag / stash / branch -D
//
// Parsing is split out from spawning so the parsers can be unit-tested
// without touching the filesystem. `readLocalGit` orchestrates the spawns
// and feeds the raw stdout into the parsers.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExecStatusGitData, GitCommitRecord } from "./types.js";

const execFileP = promisify(execFile);

const RECENT_COMMITS_LIMIT = 5;

// ASCII unit-separator (`\x1f`) tuple between sha and subject. Using `%x1f`
// rather than `%x09` (tab) avoids silently dropping commit subjects whose
// first character is a tab (git would round-trip such subjects through `%s`).
// The unit-separator byte is virtually impossible inside a real commit subject.
const LOG_FORMAT = "%h%x1f%s";
const LOG_FIELD_SEPARATOR = "\x1f";

// `git status --porcelain=v1 -z` emits NUL-terminated entries. Renames also
// emit a second NUL-separated path. We declare these as named constants
// rather than magic literals.
const NUL = "\0";
const PORCELAIN_RENAME = "R";
const PORCELAIN_COPY = "C";
const UNTRACKED_X = "?";
const UNTRACKED_Y = "?";

interface GitInvocationOk {
  readonly ok: true;
  readonly stdout: string;
}

interface GitInvocationError {
  readonly ok: false;
  readonly code: "ENOENT" | "EXIT_NONZERO" | "OTHER";
  readonly exitCode?: number;
  readonly stderr?: string;
  readonly message: string;
}

type GitInvocation = GitInvocationOk | GitInvocationError;

async function runGit(args: readonly string[], cwd: string): Promise<GitInvocation> {
  try {
    // No shell. Args go through execFile's argv. NUL bytes in stdout are
    // preserved because we set encoding to utf8 only on the buffer level.
    const { stdout } = await execFileP("git", args, {
      cwd,
      encoding: "utf8",
      // Some repos can produce > default 1MB of `git status` / `git log`
      // output; bump the buffer ceiling so we never silently truncate.
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, stdout };
  } catch (err) {
    const e = err as {
      code?: string | number;
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    if (e.code === "ENOENT") {
      return { ok: false, code: "ENOENT", message: "git binary not found" };
    }
    const exitCode = typeof e.code === "number" ? e.code : undefined;
    return {
      ok: false,
      code: "EXIT_NONZERO",
      ...(exitCode !== undefined ? { exitCode } : {}),
      ...(typeof e.stderr === "string" ? { stderr: e.stderr } : {}),
      message: e.message ?? "git invocation failed",
    };
  }
}

// Parsed state of `git status --porcelain=v1 -z`. All filenames are returned
// verbatim, including spaces, tabs, and unicode. Rename entries record both
// old and new path under whichever side (staged / unstaged) git reported.
export interface PorcelainParseResult {
  readonly stagedFiles: readonly string[];
  readonly unstagedFiles: readonly string[];
  readonly untrackedFiles: readonly string[];
}

// Pure parser — exported for direct unit testing.
//
// Porcelain v1 -z entries:
//   XY<space>path\0          (regular)
//   XY<space>newpath\0oldpath\0   (renames / copies; X or Y is 'R'/'C')
// Untracked entries: `?? path\0`.
//
// We classify:
//   X != ' ' && X != '?' → staged
//   Y != ' ' && Y != '?' → unstaged
//   XY == "??"           → untracked
// Rename entries: list both new and old path under the side(s) that flagged R.
export function parsePorcelainV1(stdoutZ: string): PorcelainParseResult {
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  const records = stdoutZ.split(NUL);
  // The terminal NUL produces a trailing empty record; ignore empty entries.
  let i = 0;
  while (i < records.length) {
    const entry = records[i];
    i += 1;
    if (entry === undefined || entry.length === 0) continue;
    if (entry.length < 3) continue;

    const x = entry[0]!;
    const y = entry[1]!;
    // Format is "XY path"; the third char is a space.
    const path = entry.slice(3);

    if (x === UNTRACKED_X && y === UNTRACKED_Y) {
      untracked.push(path);
      continue;
    }

    // Rename or copy: a second NUL-separated entry holds the old path.
    let oldPath: string | undefined;
    if (
      x === PORCELAIN_RENAME ||
      y === PORCELAIN_RENAME ||
      x === PORCELAIN_COPY ||
      y === PORCELAIN_COPY
    ) {
      const next = records[i];
      if (next !== undefined) {
        oldPath = next;
        i += 1;
      }
    }

    if (x !== " " && x !== UNTRACKED_X) {
      staged.push(path);
      if (oldPath !== undefined) staged.push(oldPath);
    }
    if (y !== " " && y !== UNTRACKED_Y) {
      unstaged.push(path);
      if (oldPath !== undefined) unstaged.push(oldPath);
    }
  }

  return {
    stagedFiles: dedupeSorted(staged),
    unstagedFiles: dedupeSorted(unstaged),
    untrackedFiles: dedupeSorted(untracked),
  };
}

// Pure parser — exported for direct unit testing. Each line is
// `sha<\x1f>subject`. Subjects are stripped of trailing CR; subjects
// containing further unit-separator bytes are preserved beyond the first
// separator (defensive — those bytes should not occur in normal subjects).
// Empty / malformed lines are skipped.
export function parseRecentCommits(stdout: string): readonly GitCommitRecord[] {
  const lines = stdout.split("\n");
  const out: GitCommitRecord[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line.length === 0) continue;
    const sepIdx = line.indexOf(LOG_FIELD_SEPARATOR);
    if (sepIdx <= 0) continue;
    const sha = line.slice(0, sepIdx);
    const subject = line.slice(sepIdx + 1);
    if (sha.length === 0) continue;
    out.push({ sha, subject });
  }
  return out;
}

function dedupeSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function unionChanged(parts: PorcelainParseResult): readonly string[] {
  return dedupeSorted([...parts.stagedFiles, ...parts.unstagedFiles, ...parts.untrackedFiles]);
}

// Top-level read. Returns a structured `ExecStatusGitData` — defensive on
// every git failure. Never throws.
export async function readLocalGit(cwd: string): Promise<ExecStatusGitData> {
  // Step 1 — is this a git work tree at all?
  const inWorkTree = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
  if (!inWorkTree.ok) {
    if (inWorkTree.code === "ENOENT") {
      return { isGitRepo: false, reason: "git-not-found" };
    }
    return { isGitRepo: false, reason: "not-a-git-repository" };
  }
  if (inWorkTree.stdout.trim() !== "true") {
    return { isGitRepo: false, reason: "not-a-git-repository" };
  }

  // Step 2 — repo root.
  const top = await runGit(["rev-parse", "--show-toplevel"], cwd);
  const repoRoot = top.ok ? top.stdout.trim() : cwd;

  // Step 3 — branch (empty stdout = detached HEAD).
  const branchProbe = await runGit(["branch", "--show-current"], cwd);
  const branchRaw = branchProbe.ok ? branchProbe.stdout.trim() : "";
  const branch = branchRaw.length > 0 ? branchRaw : null;

  // Step 4 — HEAD short SHA. Failure here = empty repo / no commits. We pin
  // the abbreviation length to 12 so cross-machine `core.abbrev` config does
  // not produce drifting output for byte-identical inputs.
  const headProbe = await runGit(["rev-parse", "--short=12", "HEAD"], cwd);
  const head = headProbe.ok ? headProbe.stdout.trim() : null;
  const noCommits = !headProbe.ok;

  // Step 5 — porcelain status (always attempted; no-commit repos still
  // produce useful output for untracked files).
  const status = await runGit(["status", "--porcelain=v1", "-z"], cwd);
  const porcelain = status.ok
    ? parsePorcelainV1(status.stdout)
    : { stagedFiles: [], unstagedFiles: [], untrackedFiles: [] };

  // Step 6 — recent commits. Skip if no HEAD.
  let recentCommits: readonly GitCommitRecord[] = [];
  if (!noCommits) {
    const log = await runGit(
      ["log", "--pretty=format:" + LOG_FORMAT, "-n", String(RECENT_COMMITS_LIMIT)],
      cwd,
    );
    if (log.ok) {
      recentCommits = parseRecentCommits(log.stdout);
    }
  }

  const changedFiles = unionChanged(porcelain);
  const isDirty = changedFiles.length > 0;

  const base: ExecStatusGitData = {
    isGitRepo: true,
    repoRoot,
    branch,
    head,
    isDirty,
    stagedFiles: porcelain.stagedFiles,
    unstagedFiles: porcelain.unstagedFiles,
    untrackedFiles: porcelain.untrackedFiles,
    changedFiles,
    recentCommits,
  };

  if (noCommits) {
    return { ...base, reason: "no-commits" };
  }
  return base;
}
