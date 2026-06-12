import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnOcn } from "../helpers/spawn-ocn.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// DEC-033 P1 — `ocn rewind` CLI surface: commander registration, mandatory
// flags validated before the engine runs, bilingual text + --json dual
// rendering, stable exit-code mapping (proposal §5.1).

async function readState(cwd: string) {
  return JSON.parse(await fs.readFile(join(cwd, ".ocoding", "state.json"), "utf8"));
}

async function readEvents(cwd: string) {
  const raw = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line));
}

describe("ocn rewind (pinned 0.3.0)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-cli-rewind-");
    await spawnOcn(["init", "--tier", "minimal", "--sop-version", "0.3.0"], {
      cwd: project.cwd,
    });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("exits 4 (ERR_IO_OR_CONFIG) when --to is missing", async () => {
    const result = await spawnOcn(["rewind", "--reason", "x", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("exits 4 (ERR_IO_OR_CONFIG) when --reason is missing", async () => {
    const result = await spawnOcn(["rewind", "--to", "step_project_brief", "--json"], {
      cwd: project.cwd,
    });
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("exits 4 (ERR_IO_OR_CONFIG) on a whitespace-only --reason", async () => {
    const result = await spawnOcn(
      ["rewind", "--to", "step_project_brief", "--reason", "   ", "--json"],
      { cwd: project.cwd },
    );
    expect(result.exitCode).toBe(4);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe("ERR_IO_OR_CONFIG");
  }, 30_000);

  it("exits 4 on an uninitialized directory", async () => {
    const bare = await createTempProject("ocn-cli-rewind-bare-");
    try {
      const result = await spawnOcn(
        ["rewind", "--to", "step_project_brief", "--reason", "x", "--json"],
        { cwd: bare.cwd },
      );
      expect(result.exitCode).toBe(4);
      expect(JSON.parse(result.stdout).code).toBe("ERR_IO_OR_CONFIG");
    } finally {
      await bare.cleanup();
    }
  }, 30_000);

  describe("one step in (doc create + advance)", () => {
    beforeEach(async () => {
      await spawnOcn(["doc", "create", "project-brief"], { cwd: project.cwd });
      const advanced = await spawnOcn(["advance", "--json"], { cwd: project.cwd });
      expect(advanced.exitCode).toBe(0);
    });

    it("exits 3 (ERR_STATE_MACHINE) on a target not in the profile", async () => {
      const result = await spawnOcn(
        ["rewind", "--to", "step_nonexistent", "--reason", "bad", "--json"],
        { cwd: project.cwd },
      );
      expect(result.exitCode).toBe(3);
      expect(JSON.parse(result.stdout).code).toBe("ERR_STATE_MACHINE");
    }, 30_000);

    it("exits 3 (ERR_STATE_MACHINE) on a later target", async () => {
      const result = await spawnOcn(
        ["rewind", "--to", "step_prd", "--reason", "forward", "--json"],
        { cwd: project.cwd },
      );
      expect(result.exitCode).toBe(3);
      expect(JSON.parse(result.stdout).code).toBe("ERR_STATE_MACHINE");
    }, 30_000);

    it("rewinds with --json: exit 0, from/to payload, state moved, audit written", async () => {
      const result = await spawnOcn(
        [
          "rewind",
          "--to",
          "step_project_brief",
          "--reason",
          "upgrade crossed the ledger generation point",
          "--json",
        ],
        { cwd: project.cwd },
      );
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.from).toEqual({ stateId: "state_spec", stepId: "step_scope" });
      expect(parsed.data.to).toEqual({
        stateId: "state_discovery",
        stepId: "step_project_brief",
      });
      expect(parsed.data.correlationId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);

      const state = await readState(project.cwd);
      expect(state.currentStateId).toBe("state_discovery");
      expect(state.currentStepId).toBe("step_project_brief");

      const events = await readEvents(project.cwd);
      const rewinds = events.filter(
        (e) => e.eventType === "cursor_rewind" && e.result === "success",
      );
      expect(rewinds).toHaveLength(1);
      expect(rewinds[0].correlationId).toBe(parsed.data.correlationId);
    }, 30_000);

    it("renders bilingual text on the human path", async () => {
      const result = await spawnOcn(
        ["rewind", "--to", "step_project_brief", "--reason", "回拨演示"],
        { cwd: project.cwd },
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("游标已回拨");
      expect(result.stdout).toContain("Cursor rewound");
    }, 30_000);

    it("appears in ocn --help", async () => {
      const result = await spawnOcn(["--help"], { cwd: project.cwd });
      expect(result.stdout).toContain("rewind");
    }, 30_000);
  });
});
