// MVP 5 — package.json script detection (DEC-024 PR 6).
//
// Read-only, defensive parse. Detects which well-known npm scripts are
// present and captures their (truncated) command strings. Never assumes
// the package.json schema beyond a top-level `scripts` object.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { VerifyStatusScriptsPresent } from "./types.js";
import { SCRIPT_COMMAND_TRUNCATE } from "./verify-status-constants.js";

const PACKAGE_RELATIVE_PATH = "package.json";

export interface PackageReadResult {
  readonly scripts: VerifyStatusScriptsPresent;
  readonly scriptCommands: Readonly<Record<string, string>>;
  readonly hasAnyScripts: boolean;
}

const EMPTY_SCRIPTS: VerifyStatusScriptsPresent = Object.freeze({
  lint: false,
  typecheck: false,
  test: false,
  build: false,
  coverage: false,
  smoke: false,
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function truncate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return raw.length > SCRIPT_COMMAND_TRUNCATE ? raw.slice(0, SCRIPT_COMMAND_TRUNCATE) : raw;
}

function emptyResult(smokeAvailable: boolean): PackageReadResult {
  return {
    scripts: { ...EMPTY_SCRIPTS, smoke: smokeAvailable },
    scriptCommands: {},
    hasAnyScripts: false,
  };
}

export async function readPackageScripts(
  cwd: string,
  smokeAvailable: boolean,
): Promise<PackageReadResult> {
  let raw: string;
  try {
    raw = await fs.readFile(join(cwd, PACKAGE_RELATIVE_PATH), "utf8");
  } catch {
    return emptyResult(smokeAvailable);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyResult(smokeAvailable);
  }
  if (!isRecord(parsed)) return emptyResult(smokeAvailable);
  const scriptsRaw = parsed["scripts"];
  if (!isRecord(scriptsRaw)) return emptyResult(smokeAvailable);

  const lint = truncate(scriptsRaw["lint"]);
  const typecheck = truncate(scriptsRaw["typecheck"]);
  const test = truncate(scriptsRaw["test"]);
  const build = truncate(scriptsRaw["build"]);
  const coveragePrimary = truncate(scriptsRaw["test:coverage"]);
  const coverageFallback = truncate(scriptsRaw["coverage"]);

  const scripts: VerifyStatusScriptsPresent = {
    lint: lint !== null,
    typecheck: typecheck !== null,
    test: test !== null,
    build: build !== null,
    coverage: coveragePrimary !== null || coverageFallback !== null,
    smoke: smokeAvailable,
  };

  const scriptCommands: Record<string, string> = {};
  if (lint !== null) scriptCommands["lint"] = lint;
  if (typecheck !== null) scriptCommands["typecheck"] = typecheck;
  if (test !== null) scriptCommands["test"] = test;
  if (build !== null) scriptCommands["build"] = build;
  if (coveragePrimary !== null) scriptCommands["test:coverage"] = coveragePrimary;
  else if (coverageFallback !== null) scriptCommands["coverage"] = coverageFallback;

  return {
    scripts,
    scriptCommands,
    hasAnyScripts: Object.keys(scriptCommands).length > 0,
  };
}
