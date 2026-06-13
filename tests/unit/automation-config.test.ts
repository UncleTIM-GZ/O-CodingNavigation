import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_AUTOMATION_CONFIG,
  readAutomationConfig,
  writeAutomationConfig,
} from "../../src/core/automation/automation-config.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// AM-009 / DEC-034 — automation block in the user-owned config.yaml.
// Reads are defensive (anything wrong ⇒ fully manual — fail-safe direction);
// writes are block-surgical: only the top-level `automation:` block is
// replaced, every other byte of the user's file (incl. comments) survives.

const BASE_CONFIG = `# user-owned config — do not delete my comments
tier: standard
language: zh
sopProfile: default-ai-coding-sop@0.5.0
commands:
  build: npm run build   # keep this inline comment
  test: npm test
# trailing top-level comment
`;

async function seedConfig(project: TempProject, text: string): Promise<string> {
  const dir = join(project.cwd, ".ocoding");
  await fs.mkdir(dir, { recursive: true });
  const file = join(dir, "config.yaml");
  await fs.writeFile(file, text, "utf8");
  return file;
}

describe("automation-config read", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-auto-config-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("returns fully-manual defaults when config.yaml is absent", async () => {
    const config = await readAutomationConfig(project.cwd);
    expect(config).toEqual(DEFAULT_AUTOMATION_CONFIG);
    expect(config.phase1).toBe(false);
    expect(config.phase2).toBe(false);
    expect(config.circuitBreaker.maxConsecutiveGateFailures).toBe(5);
  });

  it("returns defaults when config.yaml has no automation block", async () => {
    await seedConfig(project, BASE_CONFIG);
    expect(await readAutomationConfig(project.cwd)).toEqual(DEFAULT_AUTOMATION_CONFIG);
  });

  it("returns defaults on unparseable YAML", async () => {
    await seedConfig(project, "tier: [unclosed\n");
    expect(await readAutomationConfig(project.cwd)).toEqual(DEFAULT_AUTOMATION_CONFIG);
  });

  it("parses a valid automation block", async () => {
    await seedConfig(
      project,
      BASE_CONFIG +
        "automation:\n  phase1: true\n  phase2: false\n  circuitBreaker:\n    maxConsecutiveGateFailures: 3\n",
    );
    const config = await readAutomationConfig(project.cwd);
    expect(config.phase1).toBe(true);
    expect(config.phase2).toBe(false);
    expect(config.circuitBreaker.maxConsecutiveGateFailures).toBe(3);
  });

  it("applies defaults for omitted fields in a partial block", async () => {
    await seedConfig(project, BASE_CONFIG + "automation:\n  phase2: true\n");
    const config = await readAutomationConfig(project.cwd);
    expect(config.phase1).toBe(false);
    expect(config.phase2).toBe(true);
    expect(config.circuitBreaker.maxConsecutiveGateFailures).toBe(5);
  });

  it("falls back to fully-manual on an invalid block (unknown key / bad type)", async () => {
    await seedConfig(project, BASE_CONFIG + "automation:\n  phase1: true\n  typoKey: 1\n");
    expect(await readAutomationConfig(project.cwd)).toEqual(DEFAULT_AUTOMATION_CONFIG);
    await seedConfig(project, BASE_CONFIG + "automation:\n  phase1: maybe\n");
    expect(await readAutomationConfig(project.cwd)).toEqual(DEFAULT_AUTOMATION_CONFIG);
  });
});

describe("automation-config write", () => {
  let project: TempProject;

  beforeEach(async () => {
    project = await createTempProject("ocn-auto-config-");
  });

  afterEach(async () => {
    await project.cleanup();
  });

  it("appends the block when none exists, preserving every other byte", async () => {
    const file = await seedConfig(project, BASE_CONFIG);
    await writeAutomationConfig(project.cwd, {
      ...DEFAULT_AUTOMATION_CONFIG,
      phase1: true,
    });
    const text = await fs.readFile(file, "utf8");
    expect(text.startsWith(BASE_CONFIG)).toBe(true);
    expect(text).toContain("automation:");
    expect(text).toContain("phase1: true");
    expect(text).toContain("# keep this inline comment");
    expect(text).toContain("# trailing top-level comment");
    const back = await readAutomationConfig(project.cwd);
    expect(back.phase1).toBe(true);
    expect(back.phase2).toBe(false);
  });

  it("replaces an existing block in place, preserving content before and after", async () => {
    const file = await seedConfig(
      project,
      "tier: standard\nautomation:\n  phase1: true\n  phase2: true\ncommands:\n  test: npm test\n# tail comment\n",
    );
    await writeAutomationConfig(project.cwd, { ...DEFAULT_AUTOMATION_CONFIG, phase2: true });
    const text = await fs.readFile(file, "utf8");
    expect(text).toContain("tier: standard");
    expect(text).toContain("commands:");
    expect(text).toContain("# tail comment");
    expect(text.match(/^automation:/gm)).toHaveLength(1);
    const back = await readAutomationConfig(project.cwd);
    expect(back.phase1).toBe(false);
    expect(back.phase2).toBe(true);
  });

  it("creates config.yaml with just the block when the file is absent", async () => {
    await writeAutomationConfig(project.cwd, { ...DEFAULT_AUTOMATION_CONFIG, phase1: true });
    const back = await readAutomationConfig(project.cwd);
    expect(back.phase1).toBe(true);
  });

  it("write→read roundtrips the full config including circuit breaker", async () => {
    await seedConfig(project, BASE_CONFIG);
    const wanted = {
      phase1: true,
      phase2: true,
      circuitBreaker: { maxConsecutiveGateFailures: 7 },
    };
    await writeAutomationConfig(project.cwd, wanted);
    expect(await readAutomationConfig(project.cwd)).toEqual(wanted);
  });

  it("leaves no temp files behind (atomic temp+rename)", async () => {
    await seedConfig(project, BASE_CONFIG);
    await writeAutomationConfig(project.cwd, DEFAULT_AUTOMATION_CONFIG);
    const entries = await fs.readdir(join(project.cwd, ".ocoding"));
    expect(entries.filter((e) => e.includes(".tmp"))).toEqual([]);
  });
});
