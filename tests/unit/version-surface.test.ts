import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../../src/version.js";
import { MCP_SERVER_DEFAULT_INFO } from "../../src/mcp/server.js";

// P1-004 — every exported version surface must equal package.json. This is
// the regression net that catches the "CLI says 0.0.1-alpha.0 but npm shows
// 0.1.0-alpha.1" class of bug. We re-read package.json from disk here
// instead of importing src/version.ts as the source of truth, so a future
// drift between version.ts and package.json (e.g. a manual hardcode reverts
// the read) would still be caught.

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..");
const PKG_JSON_PATH = resolve(REPO_ROOT, "package.json");
const pkg = JSON.parse(readFileSync(PKG_JSON_PATH, "utf8")) as {
  readonly name: string;
  readonly version: string;
};

describe("version surface", () => {
  it("PACKAGE_VERSION equals package.json version", () => {
    expect(PACKAGE_VERSION).toBe(pkg.version);
  });

  it("PACKAGE_NAME equals package.json name", () => {
    expect(PACKAGE_NAME).toBe(pkg.name);
  });

  it("PACKAGE_VERSION matches semver-with-prerelease shape", () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/);
  });

  it("MCP_SERVER_DEFAULT_INFO.version equals PACKAGE_VERSION", () => {
    expect(MCP_SERVER_DEFAULT_INFO.version).toBe(PACKAGE_VERSION);
  });

  it("MCP_SERVER_DEFAULT_INFO.name remains 'ocn' (protocol identity, not npm package name)", () => {
    expect(MCP_SERVER_DEFAULT_INFO.name).toBe("ocn");
    // Sanity: the MCP server name MUST stay distinct from the npm package
    // name. Conflating the two would change the MCP host registration handle.
    expect(MCP_SERVER_DEFAULT_INFO.name).not.toBe(PACKAGE_NAME);
  });

  it("does not expose the historical stale literal '0.0.1-alpha.0'", () => {
    expect(PACKAGE_VERSION).not.toBe("0.0.1-alpha.0");
    expect(MCP_SERVER_DEFAULT_INFO.version).not.toBe("0.0.1-alpha.0");
  });
});
