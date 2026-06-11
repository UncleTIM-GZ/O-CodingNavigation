import { promises as fs } from "node:fs";
import yaml from "js-yaml";
import { Paths } from "../paths.js";

// SOP 0.4.0 — reads the project's build/test commands from
// .ocoding/config.yaml (`commands:` section, written by the 0.4.0 profile).
// Defensive: missing file / missing keys / empty strings all resolve to
// undefined — the corresponding command probes then report UNKNOWN, never
// PASS (open world). R4 hash-freezing of these commands is P5.

export interface ProjectCommands {
  readonly build?: string;
  readonly test?: string;
  /** P3 — test LISTING command for AC→test trace
   *  (e.g. `pytest --collect-only -q`, `npx vitest list`). */
  readonly test_list?: string;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export async function readProjectCommands(root: string): Promise<ProjectCommands> {
  let text: string;
  try {
    text = await fs.readFile(Paths.configFile(root), "utf8");
  } catch {
    return {};
  }
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch {
    return {};
  }
  if (raw === null || typeof raw !== "object") return {};
  const commands = (raw as Record<string, unknown>)["commands"];
  if (commands === null || typeof commands !== "object") return {};
  const record = commands as Record<string, unknown>;
  const build = nonEmptyString(record["build"]);
  const test = nonEmptyString(record["test"]);
  const testList = nonEmptyString(record["test_list"]);
  return {
    ...(build !== undefined ? { build } : {}),
    ...(test !== undefined ? { test } : {}),
    ...(testList !== undefined ? { test_list: testList } : {}),
  };
}
