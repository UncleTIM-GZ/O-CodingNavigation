import { describe, expect, it } from "vitest";
import { mapEvidence } from "../../src/core/execution-navigator/evidence-map.js";
import type {
  AcceptanceCriterion,
  ExecStatusGitData,
  GitHubPrAnalyzeData,
} from "../../src/core/execution-navigator/types.js";

function criterion(id: string, text: string): AcceptanceCriterion {
  return {
    id,
    originalId: id,
    text,
    sourceLine: 1,
    generatedId: false,
  };
}

function gitWithChanges(changedFiles: readonly string[]): ExecStatusGitData {
  return {
    isGitRepo: true,
    repoRoot: "/tmp/x",
    branch: "main",
    head: "abcdef0",
    isDirty: changedFiles.length > 0,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    changedFiles,
    recentCommits: [],
  };
}

function emptyGit(): ExecStatusGitData {
  return {
    isGitRepo: true,
    repoRoot: "/tmp/x",
    branch: "main",
    head: "abcdef0",
    isDirty: false,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    changedFiles: [],
    recentCommits: [],
  };
}

function ghWithChecksSuccessAndFile(filePath: string): GitHubPrAnalyzeData {
  return {
    command: "github.analyze_pr",
    implemented: true,
    noMutation: true,
    evidenceSourcesUsed: ["github", "ocn-state"],
    prNumber: 42,
    pr: {
      number: 42,
      title: "feat: example",
      body: "PR body",
      state: "OPEN",
      url: "https://github.com/x/y/pull/42",
      author: "alice",
      headRefName: "feat/x",
      baseRefName: "main",
      isDraft: false,
      mergeable: "MERGEABLE",
      mergeStateStatus: "CLEAN",
    },
    changes: {
      changedFiles: 1,
      additions: 1,
      deletions: 0,
      files: [{ path: filePath, additions: 1, deletions: 0, changeType: "modified" }],
    },
    commits: [],
    checks: {
      summary: "success",
      total: 1,
      passed: 1,
      failed: 0,
      pending: 0,
      items: [{ name: "build", status: "COMPLETED", conclusion: "SUCCESS" }],
    },
    reviews: { total: 0, approved: 0, changesRequested: 0, commented: 0 },
    ocn: { isOcnProject: false, reason: "state-missing" },
    analysis: {
      status: "ready-to-review",
      riskFlags: [],
      nextSuggestedAction: "Review changed files against acceptance criteria before merge.",
    },
    warnings: [],
  };
}

describe("mapEvidence — strong CLI signal", () => {
  it("flags evidence-found when criterion mentions ocn init and src/cli/init.ts changed", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-001", "User can run ocn init to bootstrap a project.")],
      git: gitWithChanges(["src/cli/commands/init.ts"]),
      github: null,
    });
    expect(result.coverageStatus).toBe("complete");
    expect(result.items[0]?.status).toBe("evidence-found");
    expect(result.items[0]?.confidence).toBe("medium");
    expect(result.items[0]?.humanReviewRequired).toBe(false);
    expect(result.items[0]?.evidence[0]?.source).toBe("local-git-file");
  });

  it("escalates confidence to high when test file + passing checks both present", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-007", "tests cover the build pipeline")],
      git: gitWithChanges(["tests/unit/build-pipeline.test.ts"]),
      github: ghWithChecksSuccessAndFile("docs/changelog.md"),
    });
    const item = result.items[0];
    expect(item?.status).toBe("evidence-found");
    expect(item?.confidence).toBe("high");
  });
});

describe("mapEvidence — candidate keyword overlap", () => {
  it("flags evidence-candidate when only path keywords overlap (no strong signal)", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-002", "Snapshot writer handles concurrency.")],
      git: gitWithChanges(["src/utils/snapshot.ts"]),
      github: null,
    });
    expect(result.items[0]?.status).toBe("evidence-candidate");
    expect(result.items[0]?.confidence).toBe("low");
    expect(result.items[0]?.humanReviewRequired).toBe(true);
  });
});

describe("mapEvidence — missing evidence", () => {
  it("returns missing-evidence with deterministic notes when nothing matches", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-003", "Some unrelated criterion about taxonomy.")],
      git: gitWithChanges(["src/cli/commands/init.ts"]),
      github: null,
    });
    expect(result.items[0]?.status).toBe("missing-evidence");
    expect(result.coverageStatus).toBe("missing");
    expect(result.items[0]?.missingEvidence).toContain(
      "no changed file matches criterion keywords",
    );
    expect(result.items[0]?.missingEvidence).toContain("no commit subject mentions criterion");
  });

  it("includes 'no GitHub checks observed' note when github was provided but no match", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-003", "Some unrelated taxonomy.")],
      git: emptyGit(),
      github: ghWithChecksSuccessAndFile("src/foo.ts"),
    });
    const notes = result.items[0]?.missingEvidence ?? [];
    expect(notes).toContain("no GitHub checks observed");
  });
});

describe("mapEvidence — needs-human-review", () => {
  it("flags needs-human-review when criterion mentions manual review", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-004", "Manual review of UX wording is required.")],
      git: gitWithChanges(["src/cli/commands/init.ts"]),
      github: null,
    });
    expect(result.items[0]?.status).toBe("needs-human-review");
    expect(result.items[0]?.humanReviewRequired).toBe(true);
    expect(result.coverageStatus).toBe("needs-human-review");
  });

  it("flags needs-human-review when criterion mentions performance or security", () => {
    const r1 = mapEvidence({
      criteria: [criterion("AC-005", "Performance must remain under 100ms.")],
      git: emptyGit(),
      github: null,
    });
    expect(r1.items[0]?.status).toBe("needs-human-review");

    const r2 = mapEvidence({
      criteria: [criterion("AC-006", "Security review of auth flow.")],
      git: emptyGit(),
      github: null,
    });
    expect(r2.items[0]?.status).toBe("needs-human-review");
  });
});

describe("mapEvidence — coverage status derivations", () => {
  it("complete when every criterion is evidence-found", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-001", "ocn init bootstraps")],
      git: gitWithChanges(["src/cli/commands/init.ts"]),
      github: null,
    });
    expect(result.coverageStatus).toBe("complete");
  });

  it("partial when at least one found and one not-found", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-001", "ocn init"), criterion("AC-002", "totally unrelated")],
      git: gitWithChanges(["src/cli/commands/init.ts"]),
      github: null,
    });
    expect(result.coverageStatus).toBe("partial");
  });

  it("missing when no found and at least one missing", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-001", "totally unrelated")],
      git: emptyGit(),
      github: null,
    });
    expect(result.coverageStatus).toBe("missing");
  });

  it("needs-human-review when all criteria are needs-human-review", () => {
    const result = mapEvidence({
      criteria: [
        criterion("AC-001", "manual review of copy"),
        criterion("AC-002", "security review"),
      ],
      git: emptyGit(),
      github: null,
    });
    expect(result.coverageStatus).toBe("needs-human-review");
  });

  it("no-acceptance-criteria when criteria array is empty", () => {
    const result = mapEvidence({ criteria: [], git: emptyGit(), github: null });
    expect(result.coverageStatus).toBe("no-acceptance-criteria");
    expect(result.items).toEqual([]);
  });
});

describe("mapEvidence — determinism", () => {
  it("produces byte-identical JSON for same inputs", () => {
    const inputs = {
      criteria: [criterion("AC-002", "ocn check"), criterion("AC-001", "ocn init")],
      git: gitWithChanges([
        "src/cli/commands/init.ts",
        "src/cli/commands/check.ts",
        "tests/unit/init.test.ts",
      ]),
      github: null,
    };
    const a = JSON.stringify(mapEvidence(inputs));
    const b = JSON.stringify(mapEvidence(inputs));
    expect(a).toBe(b);
  });

  it("sorts items by criterionId ascending", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-INIT-002", "second domain"), criterion("AC-001", "first numeric")],
      git: emptyGit(),
      github: null,
    });
    expect(result.items.map((i) => i.criterionId)).toEqual(["AC-001", "AC-INIT-002"]);
  });

  it("sorts evidence by (source, ref) ascending", () => {
    const result = mapEvidence({
      criteria: [criterion("AC-001", "ocn init test")],
      git: gitWithChanges([
        "tests/unit/init-something.test.ts",
        "src/cli/commands/init.ts",
        "src/cli/commands/init-helper.ts",
      ]),
      github: null,
    });
    const refs = result.items[0]?.evidence.map((e) => `${e.source}|${e.ref}`) ?? [];
    const sorted = [...refs].sort();
    expect(refs).toEqual(sorted);
  });
});

describe("mapEvidence — PR text mentions criterion ID", () => {
  it("upgrades a candidate to medium confidence when PR title mentions criterion id", () => {
    const gh = ghWithChecksSuccessAndFile("README.md");
    const ghMutated: GitHubPrAnalyzeData = {
      ...gh,
      pr: gh.pr === null ? null : { ...gh.pr, title: "feat: implements AC-009" },
      checks:
        gh.checks === null ? null : { ...gh.checks, summary: "pending", passed: 0, pending: 1 },
    };
    const result = mapEvidence({
      criteria: [criterion("AC-009", "Some custom criterion that mentions taxonomy.")],
      git: emptyGit(),
      github: ghMutated,
    });
    expect(result.items[0]?.status).toBe("evidence-candidate");
    expect(result.items[0]?.confidence).toBe("medium");
    const sources = result.items[0]?.evidence.map((e) => e.source) ?? [];
    expect(sources).toContain("github-pr-title");
  });
});
