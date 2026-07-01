import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAcceptanceProjection,
  readAcceptanceSpecs,
  sha256Hex,
  writeAcceptanceSpecs,
} from "../../src/core/acceptance/acceptance-spec-store.js";
import type { AcceptanceSpec } from "../../src/types/acceptance-spec.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// SOP 0.8.0 (AM-015) — acceptance projection store: defensive reads, atomic writes.

const SPECS: readonly AcceptanceSpec[] = [
  { id: "AC-INIT-001", desc: "init lands .ocoding", trace: [] },
  { id: "AC-GATE-001", desc: "gate aggregates step gates", trace: ["FR-GATE"] },
];

describe("acceptance-spec-store", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-acceptance-specs-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("readAcceptanceSpecs returns null when the file is absent", async () => {
    expect(await readAcceptanceSpecs(project.cwd)).toBeNull();
  });

  it("readAcceptanceSpecs returns null on invalid JSON / invalid schema", async () => {
    const file = join(project.cwd, ".ocoding", "acceptance-specs.json");
    await fs.mkdir(join(project.cwd, ".ocoding"), { recursive: true });
    await fs.writeFile(file, "{not json", "utf8");
    expect(await readAcceptanceSpecs(project.cwd)).toBeNull();
    await fs.writeFile(file, JSON.stringify({ version: 2, items: [] }), "utf8");
    expect(await readAcceptanceSpecs(project.cwd)).toBeNull();
  });

  it("write/read roundtrip preserves the projection and leaves no temp files", async () => {
    const projection = buildAcceptanceProjection(SPECS, sha256Hex("section"));
    await writeAcceptanceSpecs(project.cwd, projection);
    expect(await readAcceptanceSpecs(project.cwd)).toEqual(projection);
    const entries = await fs.readdir(join(project.cwd, ".ocoding"));
    expect(entries.filter((e) => e.includes(".tmp"))).toEqual([]);
  });

  it("buildAcceptanceProjection stamps version/generatedAt/specsHash", () => {
    const projection = buildAcceptanceProjection(SPECS, "abc");
    expect(projection.version).toBe(1);
    expect(projection.specsHash).toBe("abc");
    expect(projection.generatedAt.endsWith("Z")).toBe(true);
    expect(projection.items).toHaveLength(2);
  });
});
