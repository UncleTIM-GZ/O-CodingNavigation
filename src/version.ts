import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// P1-004 — single source of truth for the package version surface.
//
// We read package.json at module load using a path computed from
// import.meta.url. This works in both layouts:
//   * dev (tsx / vitest):  src/version.ts → ${repo}/src/ → ../package.json
//   * built dist runtime:  dist/version.js → ${install}/dist/ → ../package.json
//
// Reading at runtime — rather than hardcoding a string — guarantees that
// `npm version` bumps automatically propagate to ocn --version and to the
// MCP server metadata without a follow-up source change. A test pins the
// constants against package.json so any divergence fails CI.

const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
  readonly name: string;
  readonly version: string;
};

export const PACKAGE_NAME = pkg.name;
export const PACKAGE_VERSION = pkg.version;
