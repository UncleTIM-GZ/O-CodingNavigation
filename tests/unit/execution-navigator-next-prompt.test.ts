import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { generateNextPrompt } from "../../src/core/execution-navigator/next-prompt.js";
import {
  AGENT_OVERLAYS,
  FORBIDDEN_ACTIONS,
  REVIEW_MODE_FORBIDDEN_PREFIX,
  SECTION_HEADER,
  SECTIONS,
} from "../../src/core/execution-navigator/next-prompt-templates.js";
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

function writeAcceptance(dir: string, body: string): void {
  mkdirSync(join(dir, "docs"), { recursive: true });
  writeFileSync(join(dir, "docs", "03-acceptance-criteria.md"), body, "utf8");
}

// Build a fake gh runner that returns the given canned responses keyed on
// the joined argv. Each call increments a counter so tests can assert
// "runner was not called".
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

const PR_64_OK_KEY = ["pr", "view", "64", "--json", PR_VIEW_FIELDS].join("|");

describe("generateNextPrompt — local evidence only", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-next-prompt-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("generates prompt with every required section in correct order", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n");
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    const prompt = result.data.prompt;
    expect(prompt).toContain(SECTION_HEADER);
    let cursor = -1;
    for (const heading of SECTIONS) {
      const idx = prompt.indexOf(heading, cursor + 1);
      expect(idx).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("--issue overrides the current objective", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
      issue: "do X",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt).toContain("Resolve the following issue: do X.");
  });

  it("risk flags are deduplicated and sorted lexicographically", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    const flags = result.data.summary.riskFlags;
    const sorted = [...flags].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(flags).toEqual(sorted);
    expect(new Set(flags).size).toBe(flags.length);
  });

  it("forbidden actions list is always included, complete and in fixed order", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    const prompt = result.data.prompt;
    let cursor = prompt.indexOf("## Forbidden actions");
    expect(cursor).toBeGreaterThan(-1);
    for (const f of FORBIDDEN_ACTIONS) {
      const idx = prompt.indexOf(`- ${f}`, cursor);
      expect(idx).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("verification commands include lint/typecheck/test/build by default", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    const prompt = result.data.prompt;
    expect(prompt).toContain("npm run lint");
    expect(prompt).toContain("npm run typecheck");
    expect(prompt).toContain("npm run test");
    expect(prompt).toContain("npm run build");
    expect(prompt).not.toContain("smoke.sh");
    expect(prompt).not.toContain("npm run test:coverage");
  });

  it("appends smoke command when smoke.sh exists", async () => {
    mkdirSync(join(dir, "examples", "plan-to-verify", "scripts"), { recursive: true });
    writeFileSync(
      join(dir, "examples", "plan-to-verify", "scripts", "smoke.sh"),
      "#!/bin/sh\n",
      "utf8",
    );
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt).toContain("bash examples/plan-to-verify/scripts/smoke.sh");
  });

  it("--mode verify adds npm run test:coverage", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "verify",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt).toContain("npm run test:coverage");
  });

  it("--mode review adds analysis-only allowed work and review-only forbidden line", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "review",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    const prompt = result.data.prompt;
    const forbiddenIdx = prompt.indexOf("## Forbidden actions");
    expect(forbiddenIdx).toBeGreaterThan(-1);
    // Review-mode forbidden prefix must be the first bullet under the heading.
    const firstBulletIdx = prompt.indexOf(`- ${REVIEW_MODE_FORBIDDEN_PREFIX}`, forbiddenIdx);
    expect(firstBulletIdx).toBeGreaterThan(-1);
    // It must come before any of the standard forbidden lines.
    for (const f of FORBIDDEN_ACTIONS) {
      expect(prompt.indexOf(`- ${f}`, forbiddenIdx)).toBeGreaterThan(firstBulletIdx);
    }
    // Allowed work in review mode is analysis-only.
    expect(prompt).toContain("read and analyse only");
  });

  it("agent claude-code overlay is prepended verbatim", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "claude-code",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt.startsWith(AGENT_OVERLAYS["claude-code"])).toBe(true);
  });

  it("agent codex overlay is prepended verbatim", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "codex",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt.startsWith(AGENT_OVERLAYS["codex"])).toBe(true);
  });

  it("agent lfg overlay is prepended verbatim", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "lfg",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt.startsWith(AGENT_OVERLAYS["lfg"])).toBe(true);
  });

  it("agent generic does not prepend any overlay (prompt starts with #)", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.prompt.startsWith(SECTION_HEADER)).toBe(true);
  });

  it("acceptance-file-missing flow when no docs/03-acceptance-criteria.md", async () => {
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.summary.riskFlags).toContain("acceptance-file-missing");
    expect(result.data.summary.acceptanceCoverageStatus).toBe("no-acceptance-criteria");
    expect(result.data.prompt).toContain("coverage: no-acceptance-criteria");
  });

  it("determinism: identical inputs produce byte-identical prompt strings", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n");
    const r1 = await generateNextPrompt({ cwd: dir, agent: "generic", mode: "continue" });
    const r2 = await generateNextPrompt({ cwd: dir, agent: "generic", mode: "continue" });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok || r1.data === undefined || r2.data === undefined) return;
    expect(r1.data.prompt).toBe(r2.data.prompt);
  });

  it("no-mutation: invoking the generator does not create .ocoding/execution or modify any file", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 user can run ocn init\n");
    const before = snapshotTree(dir);
    await generateNextPrompt({ cwd: dir, agent: "generic", mode: "continue" });
    const after = snapshotTree(dir);
    expect(after).toEqual(before);
    expect(existsSync(join(dir, ".ocoding"))).toBe(false);
    expect(existsSync(join(dir, ".ocoding", "execution"))).toBe(false);
  });
});

describe("generateNextPrompt — github evidence path", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ocn-next-prompt-gh-unit-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("github PR evidence is included only when --pr is provided", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
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
      files: [
        { path: "src/cli/commands/init.ts", additions: 10, deletions: 0, changeType: "modified" },
      ],
      reviews: [],
      statusCheckRollup: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    });
    const map = new Map<string, { ok: true; stdout: string; stderr: string }>();
    map.set(["auth", "status"].join("|"), { ok: true, stdout: "", stderr: "Logged in" });
    map.set(PR_64_OK_KEY, { ok: true, stdout: prJson, stderr: "" });
    const { runner } = fakeRunner(map);
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
      prNumber: 64,
      runner,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.evidenceSourcesUsed).toContain("github");
    expect(result.data.prompt).toContain("pr: #64");
  });

  it("github-evidence-unavailable when gh runner returns error envelope; prompt still generates", async () => {
    writeAcceptance(dir, "## Acceptance Criteria\n\n- AC-001 init\n");
    const map = new Map<
      string,
      | { ok: true; stdout: string; stderr: string }
      | { ok: false; code: "ENOENT" | "EXIT_NONZERO" | "OTHER"; stderr?: string; message: string }
    >();
    map.set(["auth", "status"].join("|"), {
      ok: false,
      code: "EXIT_NONZERO",
      stderr: "You are not authenticated. Run gh auth login.",
      message: "auth failed",
    });
    const { runner } = fakeRunner(map);
    const result = await generateNextPrompt({
      cwd: dir,
      agent: "generic",
      mode: "continue",
      prNumber: 99,
      runner,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data === undefined) return;
    expect(result.data.summary.riskFlags).toContain("github-evidence-unavailable");
    expect(result.data.warnings.length).toBeGreaterThan(0);
    expect(result.data.prompt.length).toBeGreaterThan(0);
    expect(result.data.evidenceSourcesUsed).not.toContain("github");
  });
});
