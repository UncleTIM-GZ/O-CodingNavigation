import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateEvidenceMap } from "../../src/core/execution-navigator/evidence-map-runner.js";
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

interface FakeGhRunnerEntry {
  readonly args: readonly string[];
  readonly response: Awaited<ReturnType<GhRunner["run"]>>;
}

interface CountingRunner extends GhRunner {
  readonly callCount: () => number;
}

function makeRunner(entries: readonly FakeGhRunnerEntry[]): CountingRunner {
  let count = 0;
  return {
    async run(args: readonly string[]) {
      count += 1;
      const match = entries.find(
        (e) => e.args.length === args.length && e.args.every((a, i) => a === args[i]),
      );
      if (match === undefined) {
        return { ok: false as const, code: "OTHER" as const, message: "no fixture" };
      }
      return match.response;
    },
    callCount: () => count,
  };
}

describe("generateEvidenceMap — orchestrator", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-evidence-map-runner-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns coverageStatus=no-acceptance-criteria when AC file missing", async () => {
    const result = await generateEvidenceMap({ cwd: dir });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.acceptance.found).toBe(false);
    expect(result.data.acceptance.criteriaCount).toBe(0);
    expect(result.data.mapping.coverageStatus).toBe("no-acceptance-criteria");
    expect(result.data.analysis.riskFlags).toContain("acceptance-file-missing");
    expect(result.data.evidenceSourcesUsed).not.toContain("github");
  });

  it("does not invoke gh runner when --pr is not provided", async () => {
    const runner = makeRunner([]);
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(
      join(dir, "docs", "03-acceptance-criteria.md"),
      "## Acceptance Criteria\n\n- AC-001 user can run init\n",
      "utf8",
    );
    const result = await generateEvidenceMap({ cwd: dir, runner });
    expect(result.ok).toBe(true);
    expect(runner.callCount()).toBe(0);
  });

  it("falls back gracefully when gh fails (gh-not-found) → riskFlag and warnings", async () => {
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(
      join(dir, "docs", "03-acceptance-criteria.md"),
      "## Acceptance Criteria\n\n- AC-001 user can run init\n",
      "utf8",
    );
    const runner = makeRunner([
      {
        args: ["auth", "status"],
        response: { ok: false, code: "ENOENT", message: "gh binary not found" },
      },
    ]);
    const result = await generateEvidenceMap({ cwd: dir, prNumber: 99, runner });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.analysis.riskFlags).toContain("github-evidence-unavailable");
    expect(result.data.warnings.some((w) => w.includes("gh-not-found"))).toBe(true);
    expect(result.data.evidenceSourcesUsed).not.toContain("github");
    expect(result.data.analysis.nextSuggestedAction).toMatch(/authenticate gh/);
  });

  it("includes github evidence when gh runner returns valid PR data", async () => {
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(
      join(dir, "docs", "03-acceptance-criteria.md"),
      "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n",
      "utf8",
    );
    const prJson = JSON.stringify({
      number: 64,
      title: "feat: example",
      body: "PR body",
      state: "OPEN",
      author: { login: "alice" },
      headRefName: "feat/x",
      baseRefName: "main",
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
      isDraft: false,
      url: "https://github.com/x/y/pull/64",
      commits: [{ oid: "abc1234", messageHeadline: "feat: init" }],
      files: [{ path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" }],
      reviews: [],
      statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    });
    const runner = makeRunner([
      { args: ["auth", "status"], response: { ok: true, stdout: "", stderr: "Logged in" } },
      {
        args: ["pr", "view", "64", "--json", PR_VIEW_FIELDS],
        response: { ok: true, stdout: prJson, stderr: "" },
      },
    ]);
    const result = await generateEvidenceMap({ cwd: dir, prNumber: 64, runner });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.evidenceSourcesUsed).toContain("github");
    expect(result.data.mapping.coverageStatus).toBe("complete");
  });
});
