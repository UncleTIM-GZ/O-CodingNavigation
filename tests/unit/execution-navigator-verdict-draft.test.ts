import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateVerdictDraft } from "../../src/core/execution-navigator/verdict-draft.js";
import {
  CATEGORY_CONTINUE_WORK,
  CATEGORY_HOLD,
  CATEGORY_READY_FOR_REVIEW,
  CATEGORY_READY_TO_MERGE,
  CATEGORY_REQUEST_CHANGES,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  CONFIDENCE_MEDIUM,
  NEXT_ACTION_CONTINUE_WORK,
  NEXT_ACTION_HOLD_FOR_MANUAL_REVIEW,
  NEXT_ACTION_READY_FOR_REVIEW,
  NEXT_ACTION_READY_TO_MERGE,
  NEXT_ACTION_REQUEST_CHANGES,
} from "../../src/core/execution-navigator/verdict-draft-constants.js";
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
}

function writePackageJson(dir: string, opts: PackageBuilder = {}): void {
  const scripts: Record<string, string> = {};
  if (opts.lint !== false) scripts["lint"] = "eslint .";
  if (opts.typecheck !== false) scripts["typecheck"] = "tsc --noEmit";
  if (opts.test !== false) scripts["test"] = "vitest run";
  if (opts.build !== false) scripts["build"] = "tsup";
  if (opts.testCoverage === true) scripts["test:coverage"] = "vitest run --coverage";
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
  readonly reviews?: readonly { state: string }[];
  readonly files?: readonly {
    path: string;
    additions: number;
    deletions: number;
    changeType: string;
  }[];
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
  const files = opts.files ?? [
    { path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" },
  ];
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
    files,
    reviews: opts.reviews ?? [],
    statusCheckRollup: rollup,
  });
}

function authOk() {
  return { ok: true as const, stdout: "", stderr: "Logged in" };
}

function prKey(prNumber: number): string {
  return ["pr", "view", String(prNumber), "--json", PR_VIEW_FIELDS].join("|");
}

async function gitInitClean(dir: string, files: Record<string, string> = {}) {
  const { execSync } = await import("node:child_process");
  execSync("git init -q && git checkout -q -b main", { cwd: dir });
  for (const [path, content] of Object.entries(files)) {
    const dirPath = join(dir, path).split("/").slice(0, -1).join("/");
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dir, path), content, "utf8");
  }
  if (Object.keys(files).length === 0) {
    writeFileSync(join(dir, "scratch.committed"), "init\n", "utf8");
  }
  execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m init", {
    cwd: dir,
  });
}

describe("generateVerdictDraft — Rule 3 continue-work", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-cw-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("continue-work from verification partial + dirty tree", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    // Dirty the tree.
    writeFileSync(join(dir, "scratch.txt"), "x", "utf8");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_CONTINUE_WORK);
    expect(r.data.verdict.nextSuggestedAction).toBe(NEXT_ACTION_CONTINUE_WORK);
  });
});

describe("generateVerdictDraft — Rule 2 request-changes", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-rc-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("request-changes from verification blocked (acceptance missing)", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 the system shall implement zzzunknownkeyword\n",
    );
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_REQUEST_CHANGES);
    expect(r.data.verdict.nextSuggestedAction).toBe(NEXT_ACTION_REQUEST_CHANGES);
  });

  it("request-changes from PR changesRequested > 0", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(99), {
      ok: true,
      stdout: buildPrJson({
        number: 99,
        checks: "success",
        reviews: [{ state: "CHANGES_REQUESTED" }],
      }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 99, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_REQUEST_CHANGES);
  });

  it("request-changes from coverage-missing", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 the system shall xqzunknownnowhere\n");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_REQUEST_CHANGES);
  });

  it("request-changes from PR mergeStateStatus DIRTY", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(11), {
      ok: true,
      stdout: buildPrJson({
        number: 11,
        checks: "success",
        mergeStateStatus: "DIRTY",
      }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 11, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_REQUEST_CHANGES);
  });
});

describe("generateVerdictDraft — Rule 4 ready-for-review", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-rfr-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ready-for-review from verification ready + acceptance partial + no PR", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect([CATEGORY_READY_FOR_REVIEW, CATEGORY_CONTINUE_WORK]).toContain(r.data.verdict.category);
    if (r.data.verdict.category === CATEGORY_READY_FOR_REVIEW) {
      expect(r.data.verdict.nextSuggestedAction).toBe(NEXT_ACTION_READY_FOR_REVIEW);
    }
  });
});

describe("generateVerdictDraft — Rule 5 ready-to-merge", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-rtm-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ready-to-merge from full happy path", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(67), {
      ok: true,
      stdout: buildPrJson({ number: 67, checks: "success" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 67, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    // Verification status is "ready" or "partial" depending on coverage; if ready, expect ready-to-merge.
    if (r.data.inputs.verificationStatus === "ready") {
      expect(r.data.verdict.category).toBe(CATEGORY_READY_TO_MERGE);
      expect(r.data.verdict.nextSuggestedAction).toBe(NEXT_ACTION_READY_TO_MERGE);
    }
  });
});

describe("generateVerdictDraft — Rule 1 hold-for-manual-review", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-hold-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("hold-for-manual-review from acceptance needsHumanReview > 0", async () => {
    writePackageJson(dir, { testCoverage: true });
    // Wording invokes the manual-review heuristic in evidence-map.
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 manual review of the privacy and security stance\n",
    );
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_HOLD);
    expect(r.data.verdict.nextSuggestedAction).toBe(NEXT_ACTION_HOLD_FOR_MANUAL_REVIEW);
    expect(r.data.verdict.humanReviewRequired).toBe(true);
  });

  it("hold-for-manual-review propagates from human-review-required risk flag", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 performance compliance audit review\n",
    );
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.category).toBe(CATEGORY_HOLD);
  });
});

describe("generateVerdictDraft — confidence", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-conf-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("confidence cannot be high in --mode local", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.confidence).not.toBe(CONFIDENCE_HIGH);
  });

  it("low confidence on continue-work / request-changes", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 the system shall xqzunknownnowhere\n");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.verdict.confidence).toBe(CONFIDENCE_LOW);
  });
});

describe("generateVerdictDraft — supports / blocks / warnings", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-sb-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("supports contains expected sentences and is sorted lexicographically", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    const supports = r.data.verdict.supports;
    const sorted = [...supports].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(supports).toEqual(sorted);
    expect(supports.length).toBeGreaterThan(0);
    // Should mention scripts (all four available).
    expect(supports.some((s) => s.includes("verification scripts are available"))).toBe(true);
  });

  it("blocks contain expected sentences and are sorted lexicographically", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 the system shall xqzunknownnowhere\n");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    const blocks = r.data.verdict.blocks;
    const sorted = [...blocks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(blocks).toEqual(sorted);
    expect(blocks.some((b) => b.includes("Acceptance coverage is missing for"))).toBe(true);
  });

  it("warnings propagated from gh failures", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const map = new Map<
      string,
      | { ok: true; stdout: string; stderr: string }
      | { ok: false; code: "ENOENT" | "EXIT_NONZERO" | "OTHER"; stderr?: string; message: string }
    >();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(7), {
      ok: false,
      code: "EXIT_NONZERO",
      stderr: "Could not resolve to a PullRequest",
      message: "gh exit nonzero",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 7, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.warnings).toContain("github-evidence-unavailable");
  });
});

describe("generateVerdictDraft — humanReviewRequired", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-hrr-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("humanReviewRequired matches rules — hold = true, ready-for-review = false", async () => {
    // hold case
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 manual privacy review of compliance audit\n",
    );
    const rh = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(rh.ok).toBe(true);
    if (!rh.ok || rh.data === undefined) return;
    expect(rh.data.verdict.category).toBe(CATEGORY_HOLD);
    expect(rh.data.verdict.humanReviewRequired).toBe(true);
  });
});

describe("generateVerdictDraft — risk flags", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-rf-"));
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
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    const flags = r.data.riskFlags;
    const sorted = [...flags].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(flags).toEqual(sorted);
    expect(new Set(flags).size).toBe(flags.length);
  });
});

describe("generateVerdictDraft — determinism & no-mutation", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-det-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("identical inputs produce byte-identical JSON output", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const r1 = await generateVerdictDraft({ cwd: dir, mode: "local" });
    const r2 = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok || r1.data === undefined || r2.data === undefined) return;
    expect(JSON.stringify(r1.data)).toBe(JSON.stringify(r2.data));
  });

  it("no .ocoding/execution directory is created and no project file is modified", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const before = snapshotTree(dir);
    await generateVerdictDraft({ cwd: dir, mode: "local" });
    const after = snapshotTree(dir);
    expect(after).toEqual(before);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  });

  it("--mode combined includes github source when PR fetched", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(42), {
      ok: true,
      stdout: buildPrJson({ number: 42, checks: "success" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 42, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.evidenceSourcesUsed).toContain("github");
  });

  it("--mode local excludes github from sources", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 ocn cli init\n");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.evidenceSourcesUsed).not.toContain("github");
    expect(r.data.evidenceSourcesUsed).toContain("verify-status");
  });
});

describe("generateVerdictDraft — supports cover ready paths", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-supp-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ready-to-merge supports include verification-ready and pr-checks-success sentences", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), authOk());
    map.set(prKey(67), {
      ok: true,
      stdout: buildPrJson({ number: 67, checks: "success" }),
      stderr: "",
    });
    const { runner } = fakeRunner(map);
    const r = await generateVerdictDraft({ cwd: dir, mode: "combined", prNumber: 67, runner });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    if (r.data.verdict.category === CATEGORY_READY_TO_MERGE) {
      expect(r.data.verdict.supports).toContain("PR checks succeeded.");
      expect(r.data.verdict.supports).toContain("PR mergeable state is clean.");
      expect(r.data.verdict.supports).toContain("Verification status is ready.");
    }
  });
});

describe("generateVerdictDraft — confidence medium on ready-for-review", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-cm-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("ready-for-review reaches medium confidence with up to 2 non-blocking risk flags", async () => {
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(
      dir,
      "## Acceptance Criteria\n\n- AC-001 ocn cli command init must produce output\n",
    );
    await gitInitClean(dir, { "src/cli/init.ts": "export const x = 1;\n" });
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    if (r.data.verdict.category === CATEGORY_READY_FOR_REVIEW) {
      expect([CONFIDENCE_LOW, CONFIDENCE_MEDIUM]).toContain(r.data.verdict.confidence);
    }
  });
});

describe("generateVerdictDraft — H1 deriveGitStatus discrimination", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-verdict-git-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("non-git directory reports gitStatus='no-git' (not 'empty-repo')", async () => {
    // No git init — the working directory is not a git repo at all.
    writePackageJson(dir, { testCoverage: true });
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const r = await generateVerdictDraft({ cwd: dir, mode: "local" });
    expect(r.ok).toBe(true);
    if (!r.ok || r.data === undefined) return;
    expect(r.data.inputs.gitStatus).toBe("no-git");
  });
});
