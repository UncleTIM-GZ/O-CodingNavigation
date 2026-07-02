import { promises as fs } from "node:fs";
import { basename, join } from "node:path";
import type { SopProfile } from "../../types/sop.js";
import type { StepLocation } from "../../types/state-machine.js";
import type { ProjectState } from "../../types/state.js";
import { Paths } from "../paths.js";
import { writeProfileSnapshots } from "../sop/snapshot.js";
import { writeStateUnlocked } from "../state/state-store.js";
import { nowIsoUtc } from "../time.js";

// DEC-033 — round archival for `ocn cycle new`. Caller must hold
// `.ocoding/.lock`. The archive dir name IS the round counter (ruling ② — no
// schema field); audit/ is never touched here (ruling ③ — the JSONL spans all
// cycles); config.yaml is user-owned, so a copy goes into the archive while
// the live file stays for the new round.

export function firstStepOf(profile: SopProfile): StepLocation | null {
  const stateId = profile.stateOrder[0];
  if (stateId === undefined) return null;
  const stepId = profile.stepsForState(stateId)[0];
  if (stepId === undefined) return null;
  return { stateId, stepId };
}

/** Runtime files MOVED into the archive (missing ones are skipped). The
 *  profile-owned snapshots are re-rendered right after; projections
 *  (logic-graph / readiness / task-ledger) regenerate when their gates run. */
function archiveMoveSources(cwd: string): readonly string[] {
  return [
    Paths.stateFile(cwd),
    `${Paths.stateFile(cwd)}.bak`,
    Paths.sopFile(cwd),
    Paths.gatesFile(cwd),
    Paths.artifactsFile(cwd),
    Paths.readinessRulesFile(cwd),
    Paths.logicGraphFile(cwd),
    Paths.readinessFile(cwd),
    Paths.readinessWaiversFile(cwd),
    Paths.readinessFrozenFile(cwd),
    Paths.taskLedgerFile(cwd),
    // AM-012 — the contract-drift projection is per-round; archive it with the
    // other projections so the new round's brief never shows stale coverage.
    Paths.contractGraphFile(cwd),
    // AM-015 — the acceptance-specs projection is per-round; archive it with the
    // other projections so the new round's traces/brief never bind to the prior
    // round's frozen AC ids (acceptance-loader + readAcIds are projection-first).
    Paths.acceptanceSpecsFile(cwd),
    // AM-009 — circuit-breaker state is per-round: archived + reset here.
    Paths.automationRuntimeFile(cwd),
  ];
}

export function isFsError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && typeof (err as NodeJS.ErrnoException).code === "string";
}

async function moveIfExists(src: string, destDir: string): Promise<void> {
  const dest = join(destDir, basename(src));
  try {
    await fs.rename(src, dest);
  } catch (err) {
    if (isFsError(err) && err.code === "ENOENT") return;
    throw err;
  }
}

async function copyIfExists(src: string, destDir: string): Promise<void> {
  const dest = join(destDir, basename(src));
  try {
    await fs.copyFile(src, dest);
  } catch (err) {
    if (isFsError(err) && err.code === "ENOENT") return;
    throw err;
  }
}

/** Next round number = max existing `<n>-…` prefix + 1. Must be computed
 *  inside the lock so racing cycles cannot collide on a round number. */
async function nextRoundNumber(cyclesDir: string): Promise<number> {
  await fs.mkdir(cyclesDir, { recursive: true });
  const entries = await fs.readdir(cyclesDir);
  let max = 0;
  for (const entry of entries) {
    const match = /^(\d+)-/.exec(entry);
    if (match?.[1] !== undefined) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return max + 1;
}

export interface ArchiveOutcome {
  readonly round: number;
  readonly archiveRelPath: string;
}

export async function archiveRoundUnlocked(
  cwd: string,
  currentState: ProjectState,
  profile: SopProfile,
  to: StepLocation,
): Promise<ArchiveOutcome> {
  const cyclesDir = join(Paths.ocodingDir(cwd), "cycles");
  const round = await nextRoundNumber(cyclesDir);
  const dirName = `${round}-${nowIsoUtc().replace(/[:.]/g, "-")}`;
  const archiveDir = join(cyclesDir, dirName);
  await fs.mkdir(archiveDir, { recursive: true });

  await copyIfExists(Paths.configFile(cwd), archiveDir);
  for (const src of archiveMoveSources(cwd)) {
    await moveIfExists(src, archiveDir);
  }

  // Rebuild the new round's runtime surface: profile-owned snapshots first
  // (configMode "preserve" keeps the live config.yaml), then the fresh state.
  await writeProfileSnapshots(cwd, profile, { configMode: "preserve" });
  const newState: ProjectState = {
    ...currentState,
    currentStateId: to.stateId,
    currentStepId: to.stepId,
    artifacts: {},
    latestGateResult: null,
  };
  await writeStateUnlocked(cwd, newState);

  return { round, archiveRelPath: `.ocoding/cycles/${dirName}` };
}
