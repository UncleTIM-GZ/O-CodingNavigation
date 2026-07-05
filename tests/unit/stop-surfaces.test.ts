import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { advanceState } from "../../src/core/advance/advance-state.js";
import { generateBrief } from "../../src/core/brief.js";
import { generateNextPrompt as mcpNextPrompt } from "../../src/core/prompt/generate-next-prompt.js";
import { generateNextPrompt as execNextPrompt } from "../../src/core/execution-navigator/next-prompt.js";
import { runStopHook } from "../../src/core/agent-hooks/stop-hook.js";
import { getStatus } from "../../src/core/status.js";
import { initProject } from "../../src/core/init.js";
import { stopProject } from "../../src/core/stop/stop-project.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// `ocn stop` — every AI-facing runtime surface goes quiet / refuses once the
// project is stopped, so nothing keeps pulling the AI back into the workflow.

describe("runtime surfaces honor stoppedAt (ocn stop)", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-stop-surf-");
    await initProject({ cwd: project.cwd, sopVersion: "0.3.0" });
    await stopProject({ cwd: project.cwd });
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("brief goes quiet: stopped notice, no workflow next step", async () => {
    const result = await generateBrief({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.message.zh).toContain("已终止 OCN");
    expect(result.data!.currentArtifactStatus).toBe("not_applicable");
    expect(result.data!.nextActions.join(" ")).toContain("stopped");
  });

  it("advance refuses with ERR_STATE_MACHINE", async () => {
    const result = await advanceState({ cwd: project.cwd });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ERR_STATE_MACHINE");
    expect(result.message.zh).toContain("终止");
  });

  it("status surfaces the stopped notice", async () => {
    const result = await getStatus({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.message.en).toContain("stopped");
    expect(result.data!.nextAction).toContain("stopped");
  });

  it("MCP next-prompt emits a quiet stopped instruction", async () => {
    const result = await mcpNextPrompt({ cwd: project.cwd });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data!.instruction).toContain("OCN stopped");
    expect(result.data!.requiredSections).toHaveLength(0);
  });

  it("stop hook allows the turn to end (does not force the AI to continue)", async () => {
    // The current artifact is missing → normally the hook would block. Stopped
    // flips it to allow.
    const outcome = await runStopHook({ cwd: project.cwd, payload: {} });
    expect(outcome.action).toBe("allow");
  });

  it("exec-nav next-prompt emits the stopped banner", async () => {
    const result = await execNextPrompt({
      cwd: project.cwd,
      agent: "claude-code",
      mode: "continue",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data!.prompt).toContain("OCN stopped");
  });
});
