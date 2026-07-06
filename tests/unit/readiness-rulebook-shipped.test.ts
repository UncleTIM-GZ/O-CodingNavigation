import { describe, expect, it } from "vitest";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { lintReadinessRulebook } from "../../src/core/readiness/rulebook-lint.js";
import { readinessYaml } from "../../src/sops/default-ai-coding-sop/0.4.0/readiness.js";
import { loadSopProfileByVersion } from "../../src/core/sop/loader.js";

// Guards the shipped readiness rulebook (AM-004 / DEC-028): the bundled YAML
// must parse against the schema AND lint clean. A dry run of this exact lint
// on draft v0.3.0 found 19 requires/check drift bugs — this test makes that
// class of drift permanently impossible to ship.

describe("shipped readiness rulebook (SOP 0.4.0)", () => {
  it("parses against the ReadinessRulebook schema", () => {
    const parsed = parseReadinessRulebook(readinessYaml);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rulebook).not.toBeNull();
    expect(parsed.rulebook?.version).toBe("0.4.0");
    expect(parsed.rulebook?.checks.length).toBe(55);
  });

  it("lints clean (zero findings)", () => {
    const parsed = parseReadinessRulebook(readinessYaml);
    expect(parsed.rulebook).not.toBeNull();
    if (parsed.rulebook !== null) {
      expect(lintReadinessRulebook(parsed.rulebook)).toEqual([]);
    }
  });

  it("ships on the 0.4.0+ profiles (0.4.0/0.5.0 frozen; 0.7.0 adds precise_activation — AM-014)", () => {
    expect(loadSopProfileByVersion("0.4.0").readinessYaml).toBe(readinessYaml);
    expect(loadSopProfileByVersion("0.5.0").readinessYaml).toBe(readinessYaml);
    expect(loadSopProfileByVersion("0.3.0").readinessYaml).toBeUndefined();
    expect(loadSopProfileByVersion("0.2.0").readinessYaml).toBeUndefined();
    // AM-014 — 0.7.0 = the frozen 0.4.0 rulebook + the precise_activation flag.
    const y070 = loadSopProfileByVersion("0.7.0").readinessYaml ?? "";
    expect(y070).toContain("precise_activation: true");
    expect(y070).toContain(readinessYaml);
    expect(y070).not.toBe(readinessYaml);
  });

  it("0.7.0 rulebook parses + lints clean with the precise_activation flag (AM-014)", () => {
    const y070 = loadSopProfileByVersion("0.7.0").readinessYaml ?? "";
    const parsed = parseReadinessRulebook(y070);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rulebook?.precise_activation).toBe(true);
    expect(parsed.rulebook?.checks.length).toBe(55);
    expect(lintReadinessRulebook(parsed.rulebook!)).toEqual([]);
  });

  it("runtime default IS 0.9.0 and carries the readiness rulebook (AM-017 cutover)", async () => {
    const { DEFAULT_SOP_PROFILE_VERSION, loadSopProfile } =
      await import("../../src/core/sop/loader.js");
    expect(DEFAULT_SOP_PROFILE_VERSION).toBe("0.9.0");
    expect(loadSopProfile().readinessYaml).toContain(readinessYaml);
  });
});
