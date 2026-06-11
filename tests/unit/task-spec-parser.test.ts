import { describe, expect, it } from "vitest";
import { parseTaskSpecs } from "../../src/core/task/task-spec-parser.js";

// SOP 0.5.0 (AM-007 / DEC-032) — Task Spec Block parser. Pure-function tests:
// section extraction, field parsing, structural defects, comment/fence immunity.

const HAPPY_DOC = [
  "# Build Plan｜构建计划",
  "",
  "## Target Scope｜目标范围",
  "",
  "scope prose",
  "",
  "## Task Specs｜任务规格",
  "",
  "### task_phase0_runtime_skeleton",
  "- goal: permit runtime minimal skeleton",
  "- traces: AC-03, AC-07",
  "- touches: score_risk、api_put_permit",
  "- verify: pytest tests/test_runtime.py -q",
  "- dod: all signatures executable",
  "- phase: P0",
  "- timeout: 300",
  "",
  "### task_wrapper_litellm",
  "- goal: LiteLLM wrapper seam",
  "- traces: AC-12",
  "- verify: pytest tests/integrations/test_litellm.py -q",
  "- dod: wrapper green",
  "- depends: task_phase0_runtime_skeleton",
  "",
  "## Non-goals｜非目标",
  "",
  "after-section prose with ### task_not_a_task",
].join("\n");

describe("parseTaskSpecs — happy path", () => {
  it("parses multiple task blocks with comma and 、 lists, phase, timeout", () => {
    const result = parseTaskSpecs(HAPPY_DOC);
    expect(result.found).toBe(true);
    expect(result.defects).toEqual([]);
    expect(result.tasks).toHaveLength(2);

    const first = result.tasks[0];
    expect(first?.id).toBe("task_phase0_runtime_skeleton");
    expect(first?.traces).toEqual(["AC-03", "AC-07"]);
    expect(first?.touches).toEqual(["score_risk", "api_put_permit"]);
    expect(first?.verify).toBe("pytest tests/test_runtime.py -q");
    expect(first?.phase).toBe("P0");
    expect(first?.timeoutSeconds).toBe(300);
    expect(first?.depends).toEqual([]);

    const second = result.tasks[1];
    expect(second?.id).toBe("task_wrapper_litellm");
    expect(second?.depends).toEqual(["task_phase0_runtime_skeleton"]);
    expect(second?.phase).toBeUndefined();
    expect(second?.timeoutSeconds).toBeUndefined();
  });

  it("captures the raw section text and stops at the next ## heading", () => {
    const result = parseTaskSpecs(HAPPY_DOC);
    expect(result.sectionText).toContain("## Task Specs｜任务规格");
    expect(result.sectionText).toContain("task_wrapper_litellm");
    expect(result.sectionText).not.toContain("Non-goals");
  });

  it("collects unknown keys as warnings, not defects", () => {
    const doc = [
      "## Task Specs｜任务规格",
      "### task_a",
      "- goal: g",
      "- traces: AC-1",
      "- verify: true",
      "- dod: d",
      "- owner: somebody",
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toEqual([]);
    expect(result.warnings.some((w) => w.includes('unknown key "owner"'))).toBe(true);
  });
});

describe("parseTaskSpecs — structural defects", () => {
  const VALID_FIELDS = ["- goal: g", "- traces: AC-1", "- verify: true", "- dod: d"];

  it("no_tasks when the section is absent", () => {
    const result = parseTaskSpecs("# Build Plan\n\n## Target Scope\n\nprose\n");
    expect(result.found).toBe(false);
    expect(result.defects).toEqual([{ code: "no_tasks" }]);
  });

  it("no_tasks when the section has zero task blocks", () => {
    const result = parseTaskSpecs("## Task Specs｜任务规格\n\nonly prose here\n");
    expect(result.found).toBe(true);
    expect(result.defects).toEqual([{ code: "no_tasks" }]);
  });

  it("duplicate_task_id (first block wins)", () => {
    const doc = [
      "## Task Specs",
      "### task_a",
      ...VALID_FIELDS,
      "### task_a",
      ...VALID_FIELDS,
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toContainEqual({ code: "duplicate_task_id", taskId: "task_a" });
    expect(result.tasks).toHaveLength(1);
  });

  it("invalid_task_id for bad prefix or charset", () => {
    const doc = [
      "## Task Specs",
      "### job_a",
      ...VALID_FIELDS,
      "### task_Bad-Slug",
      ...VALID_FIELDS,
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toContainEqual({ code: "invalid_task_id", taskId: "job_a" });
    expect(result.defects).toContainEqual({ code: "invalid_task_id", taskId: "task_Bad-Slug" });
  });

  it("missing_field names the field and the task", () => {
    const doc = ["## Task Specs", "### task_a", "- goal: g", "- verify: true"].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toContainEqual({
      code: "missing_field",
      taskId: "task_a",
      field: "traces",
    });
    expect(result.defects).toContainEqual({ code: "missing_field", taskId: "task_a", field: "dod" });
  });

  it("ignores blocks inside HTML comments and fenced code", () => {
    const doc = [
      "## Task Specs｜任务规格",
      "",
      "<!--",
      "### task_in_comment",
      "- goal: never registers",
      "-->",
      "",
      "```",
      "### task_in_fence",
      "- goal: never registers either",
      "```",
      "",
      "### task_real",
      "- goal: g",
      "- traces: AC-1",
      "- verify: true",
      "- dod: d",
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toEqual([]);
    expect(result.tasks.map((t) => t.id)).toEqual(["task_real"]);
  });

  it("a fenced ## heading does not terminate the section", () => {
    const doc = [
      "## Task Specs",
      "### task_a",
      ...VALID_FIELDS,
      "```",
      "## not a real heading",
      "```",
      "### task_b",
      ...VALID_FIELDS.map((f) => f),
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.tasks.map((t) => t.id)).toEqual(["task_a", "task_b"]);
  });

  it("invalid timeout degrades to a warning, not a defect", () => {
    const doc = [
      "## Task Specs",
      "### task_a",
      ...VALID_FIELDS,
      "- timeout: banana",
    ].join("\n");
    const result = parseTaskSpecs(doc);
    expect(result.defects).toEqual([]);
    expect(result.tasks[0]?.timeoutSeconds).toBeUndefined();
    expect(result.warnings.some((w) => w.includes("timeout"))).toBe(true);
  });
});
