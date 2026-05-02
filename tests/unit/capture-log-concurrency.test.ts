import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureLog } from "../../src/core/log/capture-log.js";
import { initProject } from "../../src/core/init.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// Post-Codex P2-A regression coverage for captureLog (the path used by the
// MCP `navigator.capture_log` tool and the `ocn log` CLI command).
//
// captureLog appends to docs/19-dev-log.md / docs/18-research-log.md. The
// header is materialised once via `fs.open(..., "wx")` (race-free), and each
// entry is appended via `fs.appendFile` which uses POSIX O_APPEND atomic
// semantics for writes within a filesystem page. These tests pin those
// guarantees against concurrent access:
//   - all entries land in the file (no lost writes)
//   - no entry is split across the boundary (no interleaved bytes inside one
//     `## <ts>\n\n<msg>\n\n` block)
//   - no writes happen for an uninitialized projectRoot

const DEV_LOG = "docs/19-dev-log.md";
const RESEARCH_LOG = "docs/18-research-log.md";

interface CapturedEntry {
  readonly heading: string;
  readonly body: string;
}

function parseEntries(markdown: string): CapturedEntry[] {
  // Each entry is a `## <ISO timestamp>` heading followed by the message
  // body terminated by a blank line. Anything else (e.g. the file header)
  // is ignored.
  const sections = markdown.split(/^## /m).slice(1);
  return sections.map((section) => {
    const [headingLine, ...rest] = section.split("\n");
    return {
      heading: (headingLine ?? "").trim(),
      body: rest.join("\n").trim(),
    };
  });
}

describe("captureLog — concurrent append race", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-capture-log-race-");
    await initProject({ cwd: project.cwd, tier: "minimal" });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("16 concurrent dev-log captures all land without byte interleaving", async () => {
    const writers = Array.from({ length: 16 }, (_, i) =>
      captureLog({
        cwd: project.cwd,
        type: "dev",
        message: `entry-${i.toString().padStart(2, "0")}`,
      }),
    );
    const results = await Promise.all(writers);
    expect(results.every((r) => r.ok)).toBe(true);

    const persisted = await fs.readFile(join(project.cwd, DEV_LOG), "utf8");
    expect(persisted.startsWith("# Dev Log")).toBe(true);

    const entries = parseEntries(persisted);
    expect(entries.length).toBe(16);
    const bodies = entries.map((e) => e.body).sort();
    const expected = Array.from({ length: 16 }, (_, i) => `entry-${i.toString().padStart(2, "0")}`)
      .sort();
    expect(bodies).toEqual(expected);

    for (const entry of entries) {
      expect(entry.heading).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(entry.body).toMatch(/^entry-\d{2}$/);
    }
  });

  it("dev and research captures running concurrently each land in their own log", async () => {
    const dev = Array.from({ length: 8 }, (_, i) =>
      captureLog({ cwd: project.cwd, type: "dev", message: `dev-${i}` }),
    );
    const research = Array.from({ length: 8 }, (_, i) =>
      captureLog({ cwd: project.cwd, type: "research", message: `research-${i}` }),
    );
    const results = await Promise.all([...dev, ...research]);
    expect(results.every((r) => r.ok)).toBe(true);

    const devText = await fs.readFile(join(project.cwd, DEV_LOG), "utf8");
    const researchText = await fs.readFile(join(project.cwd, RESEARCH_LOG), "utf8");

    const devEntries = parseEntries(devText)
      .map((e) => e.body)
      .sort();
    const researchEntries = parseEntries(researchText)
      .map((e) => e.body)
      .sort();

    expect(devEntries).toEqual(["dev-0", "dev-1", "dev-2", "dev-3", "dev-4", "dev-5", "dev-6", "dev-7"]);
    expect(researchEntries).toEqual([
      "research-0",
      "research-1",
      "research-2",
      "research-3",
      "research-4",
      "research-5",
      "research-6",
      "research-7",
    ]);

    // Cross-contamination check: no dev message in the research log and vice-versa.
    expect(devText).not.toMatch(/research-\d/);
    expect(researchText).not.toMatch(/dev-\d/);
  });

  it("captureLog refuses to write when the project is not initialized", async () => {
    const fresh = await createTempProject("ocn-capture-log-uninitialized-");
    try {
      const result = await captureLog({
        cwd: fresh.cwd,
        type: "dev",
        message: "should not land",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ERR_IO_OR_CONFIG");
      }
      // No log file, no .ocoding/, no docs/ should have been created.
      const entries = await fs.readdir(fresh.cwd);
      expect(entries).toEqual([]);
    } finally {
      await fresh.cleanup();
    }
  });
});
