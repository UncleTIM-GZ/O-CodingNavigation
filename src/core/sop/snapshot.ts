import { promises as fs } from "node:fs";
import type { SopProfile } from "../../types/sop.js";
import { Paths } from "../paths.js";

// DEC-029 — single writer for the .ocoding/ profile snapshot files, extracted
// from init.ts so `ocn sop upgrade` re-renders the exact same surface. The
// on-disk snapshot must fully express the runtime profile (P1-003 / AM-004):
//   sop.yaml + gates.yaml + artifacts.yaml + config.yaml
//   + readiness-rules.yaml when the profile bundles a rulebook (0.4.0+).

export interface WriteSnapshotOptions {
  /** "preserve" keeps an existing config.yaml untouched (upgrade path —
   *  config.yaml is user-edited: `commands.build/test` feed the readiness
   *  probes). "write" always renders the profile default (fresh init). */
  readonly configMode: "write" | "preserve";
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/** Profile-owned snapshot paths that an upgrade unconditionally rewrites
 *  (config.yaml excluded — it is user-owned after init). */
export function profileOwnedSnapshotPaths(cwd: string, profile: SopProfile): readonly string[] {
  return [
    Paths.sopFile(cwd),
    Paths.gatesFile(cwd),
    Paths.artifactsFile(cwd),
    ...(profile.readinessYaml !== undefined ? [Paths.readinessRulesFile(cwd)] : []),
  ];
}

/**
 * Render the profile snapshot files under `.ocoding/`. Caller must already
 * hold `.ocoding/.lock` when used in a mutation path. Returns the paths
 * actually written.
 */
export async function writeProfileSnapshots(
  cwd: string,
  profile: SopProfile,
  opts: WriteSnapshotOptions,
): Promise<readonly string[]> {
  const written: string[] = [];
  const targets: ReadonlyArray<readonly [string, string]> = [
    [Paths.sopFile(cwd), profile.sopYaml],
    [Paths.gatesFile(cwd), profile.gatesYaml],
    [Paths.artifactsFile(cwd), profile.artifactsYaml],
  ];
  for (const [path, content] of targets) {
    await fs.writeFile(path, content, "utf8");
    written.push(path);
  }
  const configFile = Paths.configFile(cwd);
  if (opts.configMode === "write" || !(await pathExists(configFile))) {
    await fs.writeFile(configFile, profile.defaultConfigYaml, "utf8");
    written.push(configFile);
  }
  // AM-004 — profiles that bundle a readiness rulebook get it snapshotted
  // alongside sop/gates/artifacts (0.1.0–0.3.0 write nothing here).
  if (profile.readinessYaml !== undefined) {
    const rulesFile = Paths.readinessRulesFile(cwd);
    await fs.writeFile(rulesFile, profile.readinessYaml, "utf8");
    written.push(rulesFile);
  }
  return written;
}
