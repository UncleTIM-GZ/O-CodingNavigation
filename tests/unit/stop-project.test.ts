import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupAgentIntegration } from "../../src/core/agent-setup/setup.js";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { createArtifact } from "../../src/core/doc.js";
import { initProject } from "../../src/core/init.js";
import { readState } from "../../src/core/state/state-store.js";
import { stopProject } from "../../src/core/stop/stop-project.js";
import { isIsoUtcZ } from "../../src/core/time.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// `ocn stop` — terminate OCN: mark state.json stopped (under the lock) and
// uninstall the Claude Code wiring. Human-only, one-way, single audit event.

interface AuditEventLike {
  readonly eventType: string;
  readonly result: string;
  readonly command?: string;
  readonly data?: { from?: unknown; stoppedAt?: string; reason?: string; teardown?: unknown };
}

async function readEvents(cwd: string): Promise<AuditEventLike[]> {
  const raw = await fs.readFile(join(cwd, ".ocoding", "audit", "audit-events.jsonl"), "utf8");
  return raw
    .trimEnd()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line) as AuditEventLike);
}

describe("stopProject (ocn stop)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-stop-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("blocks with ERR_IO_OR_CONFIG when the project is not initialized", async () => {
    const result = await stopProject({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_IO_OR_CONFIG");
  });

  describe("on an initialized project", () => {
    beforeEach(async () => {
      await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
      await setupAgentIntegration({ cwd: project.cwd, force: false });
    });

    it("writes the stoppedAt marker, keeps the cursor, and audits project_stopped", async () => {
      const result = await stopProject({ cwd: project.cwd, reason: "docs done" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected ok");
      expect(isIsoUtcZ(result.data!.stoppedAt)).toBe(true);

      const state = await readState(project.cwd);
      expect(state.stoppedAt).toBe(result.data!.stoppedAt);
      // Cursor is untouched — stop can happen from any state.
      expect(state.currentStateId).toBe("state_discovery");
      expect(state.currentStepId).toBe("step_project_brief");

      const events = await readEvents(project.cwd);
      const stopped = events.filter((e) => e.eventType === "project_stopped" && e.result === "success");
      expect(stopped).toHaveLength(1);
      expect(stopped[0]?.data?.reason).toBe("docs done");
    });

    it("uninstalls the Claude Code wiring", async () => {
      await stopProject({ cwd: project.cwd });
      await expect(fs.stat(join(project.cwd, ".claude", "ocn.md"))).rejects.toThrow();
      await expect(
        fs.stat(join(project.cwd, ".claude", "commands", "ocn-next.md")),
      ).rejects.toThrow();
      const claudeMd = await fs.readFile(join(project.cwd, "CLAUDE.md"), "utf8");
      expect(claudeMd).not.toContain("@.claude/ocn.md");
    });

    it("is idempotent — a second stop reports already-stopped and does not re-write", async () => {
      const first = await stopProject({ cwd: project.cwd });
      expect(first.ok).toBe(true);
      const firstTs = (await readState(project.cwd)).stoppedAt;

      const second = await stopProject({ cwd: project.cwd });
      expect(second.ok).toBe(true);
      // Timestamp unchanged — the first stop stands.
      expect((await readState(project.cwd)).stoppedAt).toBe(firstTs);
    });

    it("can stop from a later state too", async () => {
      await createArtifact({ cwd: project.cwd, type: "project-brief" });
      const advanced = await advanceState({ cwd: project.cwd });
      expect(advanced.ok).toBe(true);
      const result = await stopProject({ cwd: project.cwd });
      expect(result.ok).toBe(true);
      const state = await readState(project.cwd);
      expect(state.stoppedAt).not.toBeNull();
      expect(state.currentStateId).toBe("state_spec");
    });
  });
});
