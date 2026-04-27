import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  StateInvalidError,
  StateNotFoundError,
  readState,
  writeState,
} from "../../src/core/state/state-store.js";
import type { ProjectState } from "../../src/types/state.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

const validState: ProjectState = {
  schemaVersion: "1.0",
  project: {
    projectId: "test",
    name: "Test",
    tier: "minimal",
    sopProfileId: "default-ai-coding-sop",
    sopProfileVersion: "0.1.0",
  },
  currentStateId: "state_spec",
  currentStepId: "step_prd",
  artifacts: {},
  latestGateResult: null,
};

describe("state-store read/write", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject();
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("writes and reads back the same state", async () => {
    await writeState(project.cwd, validState);
    const out = await readState(project.cwd);
    expect(out).toEqual(validState);
  });

  it("throws StateNotFoundError when state.json missing", async () => {
    await expect(readState(project.cwd)).rejects.toBeInstanceOf(StateNotFoundError);
  });

  it("throws StateInvalidError when state.json has bad JSON", async () => {
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(join(project.cwd, ".ocoding", "state.json"), "{ not valid", "utf8");
    await expect(readState(project.cwd)).rejects.toBeInstanceOf(StateInvalidError);
  });

  it("throws StateInvalidError when state.json fails schema", async () => {
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(
      join(project.cwd, ".ocoding", "state.json"),
      JSON.stringify({ schemaVersion: "0.0" }),
      "utf8",
    );
    await expect(readState(project.cwd)).rejects.toBeInstanceOf(StateInvalidError);
  });
});
