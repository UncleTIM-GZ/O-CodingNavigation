import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAuditMarkdown } from "../../src/core/audit/audit-markdown.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// QUARANTINED — known-flaky concurrency test moved out of the default suite
// per DEC-013 (docs/20-decision-log.md). It passes 5/5 in isolation but
// failed under full-suite parallel load during the alpha publish prepublishOnly
// gate (third occurrence of the CI Stability Audit F-2 pattern). It is NOT
// run by `npm run test` or `npm run test:coverage`. Run it explicitly via:
//
//     npm run test:flaky
//
// Do not add tests to this file unless they are similarly known-flaky and
// covered by their own DEC entry. The goal of this directory is visibility,
// not a dumping ground.

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

describe("[FLAKY] appendAuditMarkdown — concurrent first-writes", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-md-flaky-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("concurrent first-writes still produce exactly one header", async () => {
    await Promise.all([
      appendAuditMarkdown(project.cwd, buildEvent()),
      appendAuditMarkdown(project.cwd, buildEvent()),
      appendAuditMarkdown(project.cwd, buildEvent()),
    ]);
    const raw = await fs.readFile(AuditPaths.markdownFile(project.cwd), "utf8");
    const headerMatches = raw.match(/^# Audit Trail/gm) ?? [];
    expect(headerMatches).toHaveLength(1);
    const sectionMatches = raw.match(/^## /gm) ?? [];
    expect(sectionMatches).toHaveLength(3);
  });
});
