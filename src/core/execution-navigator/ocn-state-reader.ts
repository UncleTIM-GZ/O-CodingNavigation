// MVP 1 — read-only OCN state.json reader for `ocn exec status` (DEC-024 PR 2).
//
// This intentionally does NOT acquire `.ocoding/.lock` and does NOT write
// `state.json.bak`. The Execution Navigator is a read-only inspector; it
// must never block, mutate, or compete with the writer's lock contract.
//
// Failure semantics:
//   - state.json absent  → isOcnProject: false
//   - state.json present but unparseable / schema-invalid → isOcnProject:
//     true with reason "state-unreadable" and null structured fields
//   - state.json present and valid → isOcnProject: true with structured fields

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ProjectState } from "../../types/state.js";
import type { ExecStatusOcnData } from "./types.js";

export async function readOcnProjectState(
  projectRoot: string,
): Promise<ExecStatusOcnData> {
  const stateFile = join(projectRoot, ".ocoding", "state.json");

  let raw: string;
  try {
    raw = await fs.readFile(stateFile, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return { isOcnProject: false, reason: "state-missing" };
    }
    return {
      isOcnProject: true,
      reason: "state-unreadable",
      sopProfileId: null,
      sopProfileVersion: null,
      currentStateId: null,
      currentStepId: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      isOcnProject: true,
      reason: "state-unreadable",
      sopProfileId: null,
      sopProfileVersion: null,
      currentStateId: null,
      currentStepId: null,
    };
  }

  const validated = ProjectState.safeParse(parsed);
  if (!validated.success) {
    return {
      isOcnProject: true,
      reason: "state-unreadable",
      sopProfileId: null,
      sopProfileVersion: null,
      currentStateId: null,
      currentStepId: null,
    };
  }

  const state = validated.data;
  return {
    isOcnProject: true,
    sopProfileId: state.project.sopProfileId,
    sopProfileVersion: state.project.sopProfileVersion,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
  };
}
