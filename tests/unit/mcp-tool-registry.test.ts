import { describe, expect, it } from "vitest";
import {
  ALLOWED_TOOLS,
  ALLOWED_TOOL_NAMES,
  FORBIDDEN_TOOL_NAMES,
} from "../../src/mcp/tools/index.js";

describe("MCP tool registry — exactly 7 allowed tools", () => {
  it("contains exactly 7 tools", () => {
    expect(ALLOWED_TOOLS).toHaveLength(7);
  });

  it("has the canonical names verbatim", () => {
    expect(ALLOWED_TOOL_NAMES).toEqual([
      "navigator.where_am_i",
      "navigator.brief",
      "navigator.run_gate",
      "navigator.create_artifact",
      "navigator.capture_log",
      "navigator.detect_sop_version",
      "navigator.generate_next_prompt",
    ]);
  });

  it("does NOT contain any forbidden tool name", () => {
    for (const forbidden of FORBIDDEN_TOOL_NAMES) {
      expect(ALLOWED_TOOL_NAMES).not.toContain(forbidden);
    }
    // Verbatim safety check
    expect(ALLOWED_TOOL_NAMES).not.toContain("navigator.advance_phase");
    expect(ALLOWED_TOOL_NAMES).not.toContain("navigator.capture_decision");
    expect(ALLOWED_TOOL_NAMES).not.toContain("navigator.reset_project");
    expect(ALLOWED_TOOL_NAMES).not.toContain("navigator.force_release_lock");
  });

  it("every tool has a non-empty description and inputShape", () => {
    for (const tool of ALLOWED_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.inputShape).toBe("object");
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("AM-009: auto mode adds NOTHING to the MCP surface — no auto/task/rewind/cycle tool", () => {
    for (const name of ALLOWED_TOOL_NAMES) {
      expect(name).not.toMatch(/auto|task|rewind|cycle|advance/);
    }
    expect(ALLOWED_TOOLS).toHaveLength(7);
  });

  it("FORBIDDEN_TOOL_NAMES enumerates the 4 must-not-expose tools", () => {
    expect(FORBIDDEN_TOOL_NAMES).toEqual([
      "navigator.advance_phase",
      "navigator.capture_decision",
      "navigator.reset_project",
      "navigator.force_release_lock",
    ]);
  });
});
