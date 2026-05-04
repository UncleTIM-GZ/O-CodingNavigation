import { describe, expect, it } from "vitest";
import {
  EVIDENCE_SOURCES_PLANNED,
  NEXT_IMPLEMENTATION_LABEL,
  buildSkeletonData,
  skeletonResult,
} from "../../src/core/execution-navigator/skeleton.js";
import type { ExecutionNavigatorCommand } from "../../src/core/execution-navigator/types.js";

const ALL_COMMANDS: readonly ExecutionNavigatorCommand[] = [
  "exec.status",
  "github.analyze_pr",
  "evidence.map",
  "next_prompt",
  "verify.status",
  "verdict.draft",
];

describe("execution-navigator skeleton (DEC-024 PR 1)", () => {
  it("each command builds a planned/not-implemented payload with the correct shape", () => {
    for (const command of ALL_COMMANDS) {
      const data = buildSkeletonData(command);
      expect(data.command).toBe(command);
      expect(data.status).toBe("planned");
      expect(data.implemented).toBe(false);
      expect(data.noMutation).toBe(true);
      expect(typeof data.nextImplementation).toBe("string");
      expect(data.nextImplementation.length).toBeGreaterThan(0);
      expect(Array.isArray(data.evidenceSourcesPlanned)).toBe(true);
      expect(data.evidenceSourcesPlanned.length).toBeGreaterThan(0);
    }
  });

  it("skeletonResult returns ok=true with bilingual headline message", () => {
    for (const command of ALL_COMMANDS) {
      const result = skeletonResult(command);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.code).toBe("OK");
      expect(typeof result.message.en).toBe("string");
      expect(typeof result.message.zh).toBe("string");
      expect(result.message.en.length).toBeGreaterThan(0);
      expect(result.message.zh.length).toBeGreaterThan(0);
      // Sanity: zh must actually contain CJK so it isn't accidentally English.
      expect(/[一-鿿]/.test(result.message.zh)).toBe(true);
    }
  });

  it("evidenceSourcesPlanned matches DEC-024 plan per command", () => {
    expect(EVIDENCE_SOURCES_PLANNED["exec.status"]).toEqual(["git"]);
    expect(EVIDENCE_SOURCES_PLANNED["github.analyze_pr"]).toEqual(["github"]);
    expect(EVIDENCE_SOURCES_PLANNED["evidence.map"]).toEqual(["git", "github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["next_prompt"]).toEqual(["git", "github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["verify.status"]).toEqual(["github", "ci"]);
    expect(EVIDENCE_SOURCES_PLANNED["verdict.draft"]).toEqual(["git", "github", "ci"]);
  });

  it("nextImplementation labels are stable per DEC-024 sequencing", () => {
    expect(NEXT_IMPLEMENTATION_LABEL["exec.status"]).toBe("local-git evidence ingestion");
    expect(NEXT_IMPLEMENTATION_LABEL["github.analyze_pr"]).toBe(
      "read-only GitHub PR analysis",
    );
    expect(NEXT_IMPLEMENTATION_LABEL["evidence.map"]).toBe(
      "acceptance criteria evidence mapping",
    );
    expect(NEXT_IMPLEMENTATION_LABEL["next_prompt"]).toBe("agent prompt generator");
    expect(NEXT_IMPLEMENTATION_LABEL["verify.status"]).toBe(
      "verification status summariser",
    );
    expect(NEXT_IMPLEMENTATION_LABEL["verdict.draft"]).toBe(
      "evidence-derived final verdict",
    );
  });
});
