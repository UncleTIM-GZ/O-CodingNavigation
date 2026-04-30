import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAuditMarkdown, renderMarkdownSection } from "../../src/core/audit/audit-markdown.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const buildEvent = (overrides: Partial<Parameters<typeof createAuditEvent>[0]> = {}) =>
  createAuditEvent({
    eventType: "project_initialized",
    result: "success",
    actor: "user",
    source: "cli",
    projectRoot: "/tmp/p",
    message: { en: "OCN initialized.", zh: "OCN 已初始化。" },
    ...overrides,
  });

describe("renderMarkdownSection (pure)", () => {
  it("renders metadata block + bilingual body", () => {
    const event = buildEvent({
      currentStateId: "state_spec",
      currentStepId: "step_prd",
      command: "init",
    });
    const text = renderMarkdownSection(event);
    expect(text).toContain(`## ${event.timestamp}｜project_initialized`);
    expect(text).toContain(`eventId: ${event.eventId}`);
    expect(text).toContain("eventType: project_initialized");
    expect(text).toContain("result: success");
    expect(text).toContain("source: cli");
    expect(text).toContain("actor: user");
    expect(text).toContain("currentStateId: state_spec");
    expect(text).toContain("currentStepId: step_prd");
    expect(text).toContain("command: init");
    expect(text).toContain("OCN 已初始化。");
    expect(text).toContain("OCN initialized.");
  });

  it("includes related paths when provided", () => {
    const event = buildEvent({
      relatedPaths: [".ocoding/state.json", ".ocoding/sop.yaml"],
    });
    const text = renderMarkdownSection(event);
    expect(text).toContain("Related paths:");
    expect(text).toContain("- .ocoding/state.json");
    expect(text).toContain("- .ocoding/sop.yaml");
  });

  it("omits the Related paths section when array is empty", () => {
    const event = buildEvent();
    const text = renderMarkdownSection(event);
    expect(text).not.toContain("Related paths:");
  });

  it("includes related artifact ids when provided", () => {
    const event = buildEvent({ relatedArtifactIds: ["artifact_prd"] });
    const text = renderMarkdownSection(event);
    expect(text).toContain("Related artifact ids:");
    expect(text).toContain("- artifact_prd");
  });
});

describe("appendAuditMarkdown — first-write + append", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-md-test-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("creates docs/22-audit-trail.md with the header on first write", async () => {
    await appendAuditMarkdown(project.cwd, buildEvent());
    const raw = await fs.readFile(AuditPaths.markdownFile(project.cwd), "utf8");
    expect(raw.startsWith("# Audit Trail｜审计链")).toBe(true);
    expect(raw).toContain("## ");
    expect(raw).toContain("project_initialized");
  });

  it("does NOT duplicate the header on subsequent writes", async () => {
    await appendAuditMarkdown(project.cwd, buildEvent());
    await appendAuditMarkdown(project.cwd, buildEvent());
    const raw = await fs.readFile(AuditPaths.markdownFile(project.cwd), "utf8");
    const headerMatches = raw.match(/^# Audit Trail/gm) ?? [];
    expect(headerMatches).toHaveLength(1);
  });

  // The concurrent first-write test was quarantined to tests/flaky/ per DEC-013
  // (docs/20-decision-log.md). It passes 5/5 in isolation but failed under
  // full-suite parallel load during the alpha publish prepublishOnly gate.
  // Run it explicitly via `npm run test:flaky`.
});
