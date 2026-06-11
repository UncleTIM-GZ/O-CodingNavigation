import {
  hashFrozen,
  readFrozenConfig,
  writeFrozenConfig,
  type ReadinessFrozenConfig,
} from "./freeze-store.js";
import type { ProjectCommands } from "./project-config.js";

// P5 (R4) — drift detection over the frozen probe-command/tier snapshot.
// Semantics (init writes empty commands, so freeze-at-init would freeze
// nothing useful):
//   no snapshot + all commands empty  → do nothing (never freeze "empty")
//   no snapshot + any command set     → capture baseline, zero drift
//   snapshot exists                   → compare key-by-key (a key going
//     away IS drift) + tier; on drift return the changes WITHOUT updating
//     the snapshot — the caller audits first, then calls
//     commitConfigSnapshot. A crash between the two re-reports the drift
//     next run (repeating a report beats losing one).

export interface ConfigDrift {
  readonly key: "tier" | "build" | "test" | "test_list";
  readonly from: string;
  readonly to: string;
}

export interface ConfigDriftResult {
  readonly drifts: readonly ConfigDrift[];
  readonly snapshotWritten: boolean;
}

const DRIFT_VALUE_MAX = 150;

function clip(s: string): string {
  return s.length <= DRIFT_VALUE_MAX ? s : `${s.slice(0, DRIFT_VALUE_MAX - 1)}…`;
}

function snapshotOf(
  tier: string,
  commands: ProjectCommands,
  now: () => Date,
): ReadinessFrozenConfig {
  return {
    capturedAt: now().toISOString(),
    tier,
    commands: {
      ...(commands.build !== undefined ? { build: commands.build } : {}),
      ...(commands.test !== undefined ? { test: commands.test } : {}),
      ...(commands.test_list !== undefined ? { test_list: commands.test_list } : {}),
    },
    hash: hashFrozen(tier, commands),
  };
}

export async function checkConfigDrift(
  root: string,
  tier: string,
  commands: ProjectCommands,
  now: () => Date = (): Date => new Date(),
): Promise<ConfigDriftResult> {
  const frozen = await readFrozenConfig(root);
  if (frozen === null) {
    const anySet =
      commands.build !== undefined ||
      commands.test !== undefined ||
      commands.test_list !== undefined;
    if (!anySet) return { drifts: [], snapshotWritten: false };
    await writeFrozenConfig(root, snapshotOf(tier, commands, now));
    return { drifts: [], snapshotWritten: true };
  }

  const drifts: ConfigDrift[] = [];
  if (frozen.tier !== tier) {
    drifts.push({ key: "tier", from: clip(frozen.tier), to: clip(tier) });
  }
  const keys: readonly ("build" | "test" | "test_list")[] = ["build", "test", "test_list"];
  for (const key of keys) {
    const from = frozen.commands[key] ?? "";
    const to = commands[key] ?? "";
    if (from !== to) {
      drifts.push({ key, from: clip(from), to: clip(to) });
    }
  }
  if (drifts.length === 0) return { drifts: [], snapshotWritten: false };
  return { drifts, snapshotWritten: false };
}

/** Persist the new baseline AFTER the drift audit event has been emitted. */
export async function commitConfigSnapshot(
  root: string,
  tier: string,
  commands: ProjectCommands,
  now: () => Date = (): Date => new Date(),
): Promise<void> {
  await writeFrozenConfig(root, snapshotOf(tier, commands, now));
}
