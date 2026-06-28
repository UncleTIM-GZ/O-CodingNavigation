import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONTRACT_CONFIG, readContractConfig } from "../../src/core/contract/contract-config.js";

// The `contract:` block of .ocoding/config.yaml (AM-012 D8). Fail-safe: any
// absence/corruption resolves to disabled so the gate never activates by
// accident.

describe("readContractConfig", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), "ocn-cfg-"));
    await fs.mkdir(join(root, ".ocoding"), { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const writeConfig = (yaml: string) =>
    fs.writeFile(join(root, ".ocoding", "config.yaml"), yaml);

  it("returns the disabled default when config.yaml is absent", async () => {
    expect(await readContractConfig(root)).toEqual(DEFAULT_CONTRACT_CONFIG);
    expect(DEFAULT_CONTRACT_CONFIG.enabled).toBe(false);
  });

  it("returns the disabled default when there is no contract block", async () => {
    await writeConfig("automation:\n  phase1: false\n");
    expect((await readContractConfig(root)).enabled).toBe(false);
  });

  it("parses a populated contract block", async () => {
    await writeConfig(
      [
        "contract:",
        "  enabled: true",
        "  declaration: docs/06-api-contract.md",
        "  frontendRoot: web/src",
        "  basePath: /api",
        "",
      ].join("\n"),
    );
    expect(await readContractConfig(root)).toEqual({
      enabled: true,
      declaration: "docs/06-api-contract.md",
      frontendRoot: "web/src",
      basePath: "/api",
    });
  });

  it("falls back to disabled on a malformed block (fail-safe)", async () => {
    await writeConfig("contract:\n  enabled: not-a-boolean\n");
    expect((await readContractConfig(root)).enabled).toBe(false);
  });

  it("falls back to disabled on unparseable YAML", async () => {
    await writeConfig("contract: [unterminated");
    expect((await readContractConfig(root)).enabled).toBe(false);
  });
});
