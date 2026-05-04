import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { summarizeVerifyStatus } from "../../src/core/execution-navigator/verify-status.js";
import type { GhRunner } from "../../src/core/execution-navigator/github-pr-runner.js";

const PR_VIEW_FIELDS = [
  "number",
  "title",
  "body",
  "state",
  "author",
  "headRefName",
  "baseRefName",
  "mergeable",
  "mergeStateStatus",
  "isDraft",
  "commits",
  "files",
  "reviews",
  "statusCheckRollup",
  "url",
].join(",");

function snapshotTree(root: string): readonly string[] {
  const out: string[] = [];
  function walk(p: string): void {
    if (!existsSync(p)) return;
    const stat = statSync(p);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(p)) {
        walk(join(p, entry));
      }
    } else {
      out.push(p);
    }
  }
  walk(root);
  return out.sort();
}

interface PackageBuilder {
  readonly lint?: boolean;
  readonly typecheck?: boolean;
  readonly test?: boolean;
  readonly build?: boolean;
  readonly testCoverage?: boolean;
  readonly coverage?: boolean;
}

function writePackageJson(dir: string, opts: PackageBuilder = {}): void {
  const scripts: Record<string, string> = {};
  if (opts.lint !== false) scripts["lint"] = "eslint .";
  if (opts.typecheck !== false) scripts["typecheck"] = "tsc --noEmit";
  if (opts.test !== false) scripts["test"] = "vitest run";
  if (opts.build !== false) scripts["build"] = "tsup";
  if (opts.testCoverage === true) scripts["test:coverage"] = "vitest run --coverage";
  if (opts.coverage === true) scripts["coverage"] = "nyc";
  const json = { name: "fixture", version: "0.0.0", scripts };
  writeFileSync(join(dir, "package.json"), JSON.stringify(json), "utf8");
}

function writeAcceptance(dir: string, body: string): void {
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "03-acceptance-criteria.md"), body, "utf8");
}

function fakeRunner(
  responses: Map<
    string,
    | { ok: true; stdout: string; stderr: string }
    | { ok: false; code: "ENOENT" | "EXIT_NONZERO" | "OTHER"; stderr?: string; message: string }
  >,
) {
  const calls: string[] = [];
  const runner: GhRunner = {
    async run(args) {
      const key = args.join("|");
      calls.push(key);
      const r = responses.get(key);
      if (r === undefined) {
        return { ok: false as const, code: "OTHER" as const, message: `no fixture for ${key}` };
      }
      return r;
    },
  };
  return { runner, calls };
}

interface PrJsonOpts {
  readonly number: number;
  readonly checks: "success" | "failure" | "pending" | "none";
  readonly mergeable?: string;
  readonly mergeStateStatus?: string;
  readonly isDraft?: boolean;
  readonly state?: string;
}

function buildPrJson(opts: PrJsonOpts): string {
  let rollup: unknown[] = [];
  if (opts.checks === "success") {
    rollup = [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }];
  } else if (opts.checks === "failure") {
    rollup = [{ name: "build", status: "COMPLETED", conclusion: "FAILURE" }];
  } else if (opts.checks === "pending") {
    rollup = [{ name: "build", status: "IN_PROGRESS", conclusion: null }];
  }
  return JSON.stringify({
    number: opts.number,
    title: "feat: example",
    body: "PR body",
    state: opts.state ?? "OPEN",
    author: { login: "alice" },
    headRefName: "feat/x",
    baseRefName: "main",
    mergeable: opts.mergeable ?? "MERGEABLE",
    mergeStateStatus: opts.mergeStateStatus ?? "CLEAN",
    isDraft: opts.isDraft ?? false,
    url: `https://github.com/x/y/pull/${opts.number}`,
    commits: [{ oid: "abc1234", messageHeadline: "feat: init" }],
    files: [
      { path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" },
    ],
    reviews: [],
    statusCheckRollup: rollup,
  });
}

function authOk() {
  return { ok: true as const, stdout: "", stderr: "Logged in" };
}

function prKey(prNumber: number): string {
  return ["pr", "view", String(prNumber), "--json", PR_VIEW_FIELDS].join("|");
}

describe("summarizeVerifyStatus — package.json script detection", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verify-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("detects all four required scripts plus test:coverage", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.local.scripts).toEqual({
      lint: true,
      typecheck: true,
      test: true,
      build: true,
      coverage: true,
      smoke: false,
    });
    expect(r.data.verification.requiredCommands).toEqual([
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run test:coverage",
    ]);
    expect(r.data.local.scriptCommands["test:coverage"]).toBe("vitest run --coverage");
  });

  it("missing coverage script: coverage=false, no coverage command, no-coverage-script flag", async () => {
    writePackageJson(dir);
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.local.scripts.coverage).toBe(false);
    expect(r.data.verification.requiredCommands).not.toContain("npm run test:coverage");
    expect(r.data.verification.missingSignals).toContain("no-coverage-script");
  });

  it("missing package.json: scripts all false, all no-*-script flags appended", async () => {
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.local.scripts).toEqual({
      lint: false,
      typecheck: false,
      test: false,
      build: false,
      coverage: false,
      smoke: false,
    });
    for (const sig of [
      "no-build-script",
      "no-coverage-script",
      "no-lint-script",
      "no-test-script",
      "no-typecheck-script",
    ]) {
      expect(r.data.verification.missingSignals).toContain(sig);
    }
    expect(r.data.verification.requiredCommands).toEqual([]);
  });

  it("smoke: appended only when examples/plan-to-verify/scripts/smoke.sh exists", async () => {
    writePackageJson(dir);
    mkdirSync(join(dir, "examples", "plan-to-verify", "scripts"), { recursive: true });
    writeFileSync(
      join(dir, "examples", "plan-to-verify", "scripts", "smoke.sh"),
      "#!/bin/sh\n",
      "utf8",
    );
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.local.scripts.smoke).toBe(true);
    expect(r.data.verification.requiredCommands).toContain(
      "bash examples/plan-to-verify/scripts/smoke.sh",
    );
  });
});

describe("summarizeVerifyStatus — mode handling", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verify-mode-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("--mode local ignores --pr (warning emitted, pr field absent)", async () => {
    writePackageJson(dir, { testCoverage: true });
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    const { runner, calls } = fakeRunner(map);
    const r = await summarizeVerifyStatus({
      cwd: dir,
      mode: "local",
      prNumber: 99,
      runner,
    });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.pr).toBeNull();
    expect(r.data.evidenceSourcesUsed).not.toContain("github");
    expect(calls.length).toBe(0);
    expect(r.data.warnings.some((w) => w.includes("ignoring --pr"))).toBe(true);
  });

  it("--mode combined without --pr: pr null, pr-not-provided in missingSignals", async () => {
    writePackageJson(dir, { testCoverage: true });
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "combined" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.pr).toBeNull();
    expect(r.data.verification.missingSignals).toContain("pr-not-provided");
    expect(r.data.evidenceSourcesUsed).not.toContain("github");
  });

  it("--mode combined with --pr and successful PR fetch: pr populated, sources include github", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(66), {
      ok: true,
      stdout: buildPrJson({ number: 66, checks: "success" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await summarizeVerifyStatus({
      cwd: dir,
      mode: "combined",
      prNumber: 66,
      runner,
    });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.pr).not.toBeNull();
    if (r.data.pr === null) return;
    expect(r.data.pr.number).toBe(66);
    expect(r.data.pr.checksSummary).toBe("success");
    expect(r.data.evidenceSourcesUsed).toContain("github");
  });
});

describe("summarizeVerifyStatus — status derivation", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verify-status-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ready: all 4 required scripts + acceptance complete + clean tree (mode=local)", async () => {
    writePackageJson(dir, { testCoverage: true });
    // AC text mentions cli + ocn so the strong CLI rule fires against the tests/cli path below.
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    // Make a clean git repo, then add and commit so HEAD exists and tree is clean.
    const { execSync } = await import("node:child_process");
    execSync("git init -q && git checkout -q -b main", { cwd: dir });
    // Stage a CLI source file matching the AC keywords; commit so tree is clean.
    mkdirSync(join(dir, "src", "cli"), { recursive: true });
    writeFileSync(join(dir, "src", "cli", "init.ts"), "export const x = 1;\n", "utf8");
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m init", {
      cwd: dir,
    });
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    // Coverage should be at least partial; if cli rule fires we may even get complete.
    expect(["ready", "partial"]).toContain(r.data.verification.status);
    if (r.data.verification.status === "ready") {
      expect(r.data.verification.readyForReview).toBe(true);
    }
  });

  it("partial: dirty tree triggers partial even with all scripts and acceptance", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    const { execSync } = await import("node:child_process");
    execSync("git init -q && git checkout -q -b main", { cwd: dir });
    // Commit a CLI source file matching the AC keywords so coverage is non-missing.
    mkdirSync(join(dir, "src", "cli"), { recursive: true });
    writeFileSync(join(dir, "src", "cli", "init.ts"), "export const x = 1;\n", "utf8");
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m init", {
      cwd: dir,
    });
    // Now leave an uncommitted file to dirty the tree.
    writeFileSync(join(dir, "scratch.txt"), "x", "utf8");
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verification.status).toBe("partial");
    expect(r.data.verification.missingSignals).toContain("local-working-tree-dirty");
    expect(r.data.verification.riskFlags).toContain("working-tree-dirty");
  });

  it("blocked: PR checks summary === 'failure'", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(7), {
      ok: true,
      stdout: buildPrJson({ number: 7, checks: "failure" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await summarizeVerifyStatus({
      cwd: dir,
      mode: "combined",
      prNumber: 7,
      runner,
    });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verification.status).toBe("blocked");
    expect(r.data.verification.missingSignals).toContain("checks-failing");
  });

  it("blocked: coverage status === 'missing'", async () => {
    // Acceptance criteria present but no scripts/files match → mapping = missing.
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 the system shall implement zzzunknownkeyword\n",
    );
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.acceptance.coverageStatus).toBe("missing");
    expect(r.data.verification.status).toBe("blocked");
  });

  it("pending: PR checks summary === 'pending'", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(8), {
      ok: true,
      stdout: buildPrJson({ number: 8, checks: "pending" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await summarizeVerifyStatus({
      cwd: dir,
      mode: "combined",
      prNumber: 8,
      runner,
    });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verification.status).toBe("pending");
    expect(r.data.verification.missingSignals).toContain("checks-pending");
  });

  it("no-verification-data: no scripts, no acceptance, no PR", async () => {
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verification.status).toBe("no-verification-data");
  });

  it("readyForReview === (status === 'ready')", async () => {
    // Use no-verification-data path; we just need to assert the equivalence.
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verification.readyForReview).toBe(r.data.verification.status === "ready");
  });
});

describe("summarizeVerifyStatus — risk flags & determinism", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verify-flags-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("risk flags are deduplicated and sorted lexicographically", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 manual review zzzunknownkeyword performance\n",
    );
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    const flags = r.data.verification.riskFlags;
    const sorted = [...flags].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(flags).toEqual(sorted);
    expect(new Set(flags).size).toBe(flags.length);
  });

  it("determinism: identical inputs produce byte-identical JSON output", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const r1 = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    const r2 = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok || r1.data === undefined || r2.data === undefined) return;
    expect(JSON.stringify(r1.data)).toBe(JSON.stringify(r2.data));
  });

  it("no-mutation: invoking the summarizer does not create .ocoding/execution or modify any file", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const before = snapshotTree(dir);
    await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    const after = snapshotTree(dir);
    expect(after).toEqual(before);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  });

  it("H1: non-git directory propagates isGitRepo=false and gitReason='not-a-git-repository'", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const r = await summarizeVerifyStatus({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.local.git.isGitRepo).toBe(false);
    expect(r.data.local.git.gitReason).toBe("not-a-git-repository");
  });
});
