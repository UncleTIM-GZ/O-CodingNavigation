import { describe, expect, it } from "vitest";
import {
  EVIDENCE_SOURCES_PLANNED,
  NEXT_IMPLEMENTATION_LABEL,
} from "../../src/core/execution-navigator/skeleton.js";
import type { ExecutionNavigatorCommand } from "../../src/core/execution-navigator/types.js";

// MVP 6 (DEC-024 PR 7) closes the Execution Navigator MVP series. The
// skeleton list is now empty: every Execution Navigator command graduated
// from the planned/not-implemented skeleton to a real implementation.
//
//   - exec.status         — MVP 1 (PR 2) — local-git evidence reader
//   - github.analyze_pr   — MVP 2 (PR 3) — read-only GitHub PR analysis
//   - evidence.map        — MVP 3 (PR 4) — acceptance evidence mapping
//   - next_prompt         — MVP 4 (PR 5) — agent prompt generator
//   - verify.status       — MVP 5 (PR 6) — verification status summarizer
//   - verdict.draft       — MVP 6 (PR 7) — evidence-derived final verdict
//
// The skeleton table is preserved so future commands can still consult their
// planned evidence-source set, but no command remains in the skeleton list.
const SKELETON_COMMANDS: readonly ExecutionNavigatorCommand[] = [];
const ALL_COMMANDS: readonly ExecutionNavigatorCommand[] = [
  "exec.status",
  "github.analyze_pr",
  "evidence.map",
  "next_prompt",
  "verify.status",
  "verdict.draft",
];

describe("execution-navigator skeleton (DEC-024 — series closed)", () => {
  it("no skeleton commands remain — all six commands are implemented", () => {
    expect(SKELETON_COMMANDS).toEqual([]);
  });

  it("evidenceSourcesPlanned still records the planned external evidence universe per command", () => {
    // The skeleton table records the *external* evidence sources the
    // Execution Navigator commands plan to consume. Graduated commands keep
    // their entries so future tooling can introspect the planned set.
    expect(EVIDENCE_SOURCES_PLANNED["exec.status"]).toEqual(["git"]);
    expect(EVIDENCE_SOURCES_PLANNED["github.analyze_pr"]).toEqual(["github"]);
    expect(EVIDENCE_SOURCES_PLANNED["evidence.map"]).toEqual(["git", "github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["next_prompt"]).toEqual(["git", "github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["verify.status"]).toEqual(["github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["verdict.draft"]).toEqual(["git", "github", "ci"]);
  });

  it("nextImplementation labels are stable per DEC-024 sequencing", () => {
    expect(NEXT_IMPLEMENTATION_LABEL["exec.status"]).toBe("local-git evidence ingestion");
    expect(NEXT_IMPLEMENTATION_LABEL["github.analyze_pr"]).toBe("read-only GitHub PR analysis");
    expect(NEXT_IMPLEMENTATION_LABEL["evidence.map"]).toBe("acceptance criteria evidence mapping");
    expect(NEXT_IMPLEMENTATION_LABEL["next_prompt"]).toBe("agent prompt generator");
    expect(NEXT_IMPLEMENTATION_LABEL["verify.status"]).toBe("verification status summariser");
    expect(NEXT_IMPLEMENTATION_LABEL["verdict.draft"]).toBe("evidence-derived final verdict");
  });

  it("the skeleton table covers exactly the six Execution Navigator commands (no new commands added without a DEC)", () => {
    const labels = Object.keys(NEXT_IMPLEMENTATION_LABEL).sort();
    const expected = [...ALL_COMMANDS].sort();
    expect(labels).toEqual(expected);
  });
});
