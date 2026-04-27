import { describe, expect, it } from "vitest";
import { renderText } from "../../src/cli/render/text.js";
import { renderJson } from "../../src/cli/render/json.js";
import { ok, blocked } from "../../src/core/result.js";
import { msg } from "../../src/core/i18n.js";

describe("renderText", () => {
  it("emits Chinese first then English when locale=zh", () => {
    const r = ok(msg("English msg", "中文消息"));
    const out = renderText(r, "zh");
    const lines = out.split("\n");
    expect(lines[0]).toBe("中文消息");
    expect(lines[1]).toBe("English msg");
  });

  it("emits English first when locale=en", () => {
    const r = ok(msg("English msg", "中文消息"));
    const out = renderText(r, "en");
    const lines = out.split("\n");
    expect(lines[0]).toBe("English msg");
    expect(lines[1]).toBe("中文消息");
  });

  it("includes status block when data has currentStateId", () => {
    const r = ok(msg("ok", "ok"), {
      currentStateId: "state_spec",
      currentStepId: "step_prd",
      currentArtifactPath: "docs/02-prd.md",
      nextAction: "Edit it",
      project: {
        projectId: "p",
        name: "Project Name",
        tier: "minimal",
        sopProfileId: "default-ai-coding-sop",
        sopProfileVersion: "0.1.0",
      },
    });
    const out = renderText(r, "zh");
    expect(out).toContain("Project: Project Name");
    expect(out).toContain("state_spec");
    expect(out).toContain("step_prd");
    expect(out).toContain("Next Action");
  });

  it("includes brief block when data has aiGovernanceReminder", () => {
    const r = ok(msg("brief", "简报"), {
      currentStateId: "state_spec",
      currentStepId: "step_prd",
      currentArtifactPath: "docs/02-prd.md",
      currentArtifactStatus: "missing",
      currentObjective: "Do PRD",
      currentBlockers: ["section_scenarios"],
      nextActions: ["A", "B"],
      aiGovernanceReminder: "DO NOT mark blocked as complete",
      uncertaintyPolicy: "Say 数据不足",
    });
    const out = renderText(r, "zh");
    expect(out).toContain("AI Governance Reminder");
    expect(out).toContain("Uncertainty Policy");
    expect(out).toContain("section_scenarios");
  });

  it("renders blocked result with missing sections", () => {
    const r = blocked(
      "ERR_ARTIFACT_INVALID",
      msg("missing", "缺失"),
      { artifactPath: "docs/02-prd.md", status: "blocked", missingRequiredSectionIds: ["section_scenarios"] },
    );
    const out = renderText(r, "zh");
    expect(out).toContain("docs/02-prd.md");
    expect(out).toContain("section_scenarios");
    expect(out).toContain("Status: blocked");
  });
});

describe("renderJson", () => {
  it("returns valid JSON of the CommandResult", () => {
    const r = ok(msg("done", "完成"), { x: 1 });
    const json = renderJson(r);
    const parsed = JSON.parse(json);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBe("OK");
    expect(parsed.data).toEqual({ x: 1 });
  });
});
