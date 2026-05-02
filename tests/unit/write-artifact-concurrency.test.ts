import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileExistsError,
  writeArtifact,
} from "../../src/core/artifact/template-writer.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// Post-Codex P2-A regression coverage for writeArtifact.
//
// Pre-fix, writeArtifact did fs.stat then fs.writeFile. Two concurrent
// callers with overwrite=false could both pass the existence check and one
// silently overwrote the other.
//
// Post-fix:
//   - overwrite=false uses fs.open(path, "wx") for atomic exclusive create.
//   - overwrite=true  uses tmp + fs.rename for atomic last-writer-wins.
// In neither case can a reader observe a partial write.

describe("writeArtifact — concurrent write race", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-artifact-race-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("overwrite=false: exactly one concurrent caller succeeds, the rest see FileExistsError", async () => {
    const target = join(project.cwd, "docs", "00-project-brief.md");
    const writers = Array.from({ length: 8 }, (_, i) =>
      writeArtifact(target, `# Project Brief\n\nwriter-${i}\n`, false).then(
        () => ({ ok: true as const, i }),
        (err) => ({ ok: false as const, i, err }),
      ),
    );
    const results = await Promise.all(writers);
    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);
    expect(wins.length).toBe(1);
    expect(losses.length).toBe(7);
    for (const l of losses) {
      if (!l.ok) {
        expect(l.err).toBeInstanceOf(FileExistsError);
      }
    }
    const persisted = await fs.readFile(target, "utf8");
    expect(persisted.startsWith("# Project Brief")).toBe(true);
    expect(persisted).toMatch(/writer-\d+/);
  });

  it("overwrite=true: every concurrent caller succeeds and final content matches one writer atomically", async () => {
    const target = join(project.cwd, "docs", "02-prd.md");
    await writeArtifact(target, "# PRD\n\nseed\n", false);

    const writers = Array.from({ length: 8 }, (_, i) =>
      writeArtifact(target, `# PRD\n\nwriter-${i}\n`, true),
    );
    await Promise.all(writers);

    const persisted = await fs.readFile(target, "utf8");
    expect(persisted.startsWith("# PRD")).toBe(true);
    const match = /^# PRD\n\nwriter-(\d+)\n$/.exec(persisted);
    expect(match, `unexpected persisted content: ${JSON.stringify(persisted)}`).not.toBeNull();
  });

  it("overwrite=true cleans up tmp files on success", async () => {
    const target = join(project.cwd, "docs", "01-scope.md");
    await writeArtifact(target, "# Scope\n\nv1\n", false);
    await writeArtifact(target, "# Scope\n\nv2\n", true);

    const dirEntries = await fs.readdir(join(project.cwd, "docs"));
    const leftoverTmps = dirEntries.filter((e) => e.endsWith(".tmp"));
    expect(leftoverTmps).toEqual([]);
  });
});
