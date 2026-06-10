import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RepoProbe } from "../../types/readiness.js";
import { globToRegExp } from "./artifact-resolver.js";
import type { ProjectCommands } from "./project-config.js";

const execFileP = promisify(execFile);

// SOP 0.4.0 — repo fact probes (reality side of the gate; R2/R4).
//   path probes    : a glob hit must be a NON-EMPTY file (or an existing
//                    directory) — `touch deps.lock` shells are rejected.
//   command probes : the engine runs the project's own build/test command
//                    (from .ocoding/config.yaml); unconfigured → UNKNOWN.
//                    Hash-freezing of these commands is P5.

export type ProbeStatus = "pass" | "fail" | "unknown";

export interface ProbeResult {
  readonly status: ProbeStatus;
  readonly detail: string;
}

/** Command probes resolve their actual command by probe name (the rulebook's
 *  `run` field is a placeholder — the project config is the source). */
const COMMAND_BY_PROBE_NAME: Readonly<Record<string, keyof ProjectCommands>> = {
  build_passes: "build",
  test_command_passes: "test",
};

const COMMAND_TIMEOUT_MS = 120_000;

async function statNonEmpty(path: string): Promise<boolean> {
  try {
    const st = await fs.stat(path);
    if (st.isDirectory()) return true;
    return st.size > 0;
  } catch {
    return false;
  }
}

/** `dir/sub/*.ext` — literal directory segments, glob in the last segment.
 *  `name#key` — JSON file containing a non-empty `key` (package.json#scripts). */
async function pathPatternHits(root: string, pattern: string): Promise<boolean> {
  if (pattern.includes("#")) {
    const [file = "", key = ""] = pattern.split("#");
    try {
      const raw = JSON.parse(await fs.readFile(join(root, file), "utf8")) as Record<
        string,
        unknown
      >;
      const value = raw[key];
      return value !== null && typeof value === "object" && Object.keys(value).length > 0;
    } catch {
      return false;
    }
  }
  const clean = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
  const segments = clean.split("/");
  const last = segments.pop() ?? "";
  const dir = join(root, ...segments);
  if (!last.includes("*")) {
    return statNonEmpty(join(dir, last));
  }
  const re = globToRegExp(last);
  try {
    const entries = await fs.readdir(dir);
    for (const name of entries) {
      if (re.test(name) && (await statNonEmpty(join(dir, name)))) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function runPathProbe(
  root: string,
  patterns: readonly string[],
): Promise<ProbeResult> {
  for (const pattern of patterns) {
    if (await pathPatternHits(root, pattern)) {
      return { status: "pass", detail: `matched ${pattern}` };
    }
  }
  return { status: "fail", detail: `no non-empty match among: ${patterns.join(", ")}` };
}

export async function runCommandProbe(
  root: string,
  probeName: string,
  commands: ProjectCommands,
  expectExit: number,
): Promise<ProbeResult> {
  const key = COMMAND_BY_PROBE_NAME[probeName];
  const command = key !== undefined ? commands[key] : undefined;
  if (command === undefined) {
    return {
      status: "unknown",
      detail: `command not configured (set commands.${key ?? probeName} in .ocoding/config.yaml)`,
    };
  }
  try {
    await execFileP("/bin/sh", ["-c", command], { cwd: root, timeout: COMMAND_TIMEOUT_MS });
    return expectExit === 0
      ? { status: "pass", detail: `\`${command}\` exited 0` }
      : { status: "fail", detail: `\`${command}\` exited 0, expected ${expectExit}` };
  } catch (err) {
    const code = (err as { code?: number }).code ?? 1;
    return code === expectExit
      ? { status: "pass", detail: `\`${command}\` exited ${code}` }
      : { status: "fail", detail: `\`${command}\` exited ${code}, expected ${expectExit}` };
  }
}

export async function runRepoProbe(
  root: string,
  probeName: string,
  probe: RepoProbe,
  commands: ProjectCommands,
): Promise<ProbeResult> {
  if (probe.type === "path") {
    return runPathProbe(root, probe.any);
  }
  return runCommandProbe(root, probeName, commands, probe.expect_exit);
}
