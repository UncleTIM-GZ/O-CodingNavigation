import { describe, expect, it } from "vitest";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { lintReadinessRulebook } from "../../src/core/readiness/rulebook-lint.js";
import type { ReadinessRulebook } from "../../src/types/readiness.js";

// Each lint code corresponds to a real drift class found in draft rulebooks
// (5 by red-team reading + 14 by mechanical check on v0.3.0). These tests pin
// the detector for every class.

const BASE = `
version: 0.0.1
artifact_aliases:
  artifact_prd: ["*prd*"]
repo_probes:
  git_initialized: { type: path, any: [".git/"] }
checks:
  - id: rdy_ok
    role: developer
    layer: delivery
    concern: sample
    tier_required: [solo]
    requires: [artifact_prd.requirements]
    severity: block
    scenario: "Given x When y Then z"
    check:
      requirements: count_gte:1
    fix_hint: { zh: "补需求", en: "Add requirements" }
`;

function parse(yamlText: string): ReadinessRulebook {
  const parsed = parseReadinessRulebook(yamlText);
  expect(parsed.errors).toEqual([]);
  if (parsed.rulebook === null) throw new Error("expected rulebook");
  return parsed.rulebook;
}

describe("readiness rulebook lint", () => {
  it("passes a clean minimal rulebook", () => {
    expect(lintReadinessRulebook(parse(BASE))).toEqual([]);
  });

  it("flags check fields not declared in requires (the v0.3.0 drift class)", () => {
    const bad = BASE.replace("requirements: count_gte:1", "security_constraints: count_gte:1");
    const findings = lintReadinessRulebook(parse(bad));
    expect(findings.map((f) => f.code)).toContain("check_field_not_in_requires");
  });

  it("flags requires pointing at an unknown artifact alias", () => {
    const bad = BASE.replace("artifact_prd.requirements", "artifact_ghost.requirements");
    const findings = lintReadinessRulebook(parse(bad));
    expect(findings.map((f) => f.code)).toContain("unresolvable_artifact_ref");
  });

  it("flags requires pointing at an unknown repo probe", () => {
    const bad = BASE.replace("requires: [artifact_prd.requirements]", "requires: [repo.ghost_probe]");
    const findings = lintReadinessRulebook(parse(bad));
    expect(findings.map((f) => f.code)).toContain("unresolvable_probe_ref");
  });

  it("flags malformed requires entries", () => {
    const bad = BASE.replace("artifact_prd.requirements", "just-a-string");
    const findings = lintReadinessRulebook(parse(bad));
    expect(findings.map((f) => f.code)).toContain("malformed_require");
  });

  it("flags duplicate check ids", () => {
    const dup = BASE + BASE.slice(BASE.indexOf("  - id: rdy_ok"));
    const findings = lintReadinessRulebook(parse(dup));
    expect(findings.map((f) => f.code)).toContain("duplicate_check_id");
  });

  it("flags waivable:false whose fix_hint offers WAIVED as an exit", () => {
    const bad = BASE.replace(
      'fix_hint: { zh: "补需求", en: "Add requirements" }',
      'fix_hint: { zh: "补需求，否则 WAIVED", en: "Add requirements" }\n    waivable: false',
    );
    const findings = lintReadinessRulebook(parse(bad));
    expect(findings.map((f) => f.code)).toContain("waivable_false_mentions_waived");
  });

  it("schema rejects unknown predicate values (closed vocabulary, R1)", () => {
    const bad = BASE.replace("count_gte:1", "looks_good_to_me");
    const parsed = parseReadinessRulebook(bad);
    expect(parsed.rulebook).toBeNull();
    expect(parsed.errors.join(" ")).toMatch(/predicate/);
  });

  it("allows engine-derived check fields without a requires declaration", () => {
    const derived = BASE.replace(
      "requirements: count_gte:1",
      "each_acceptance_scenario_has_test_ref: true",
    );
    expect(lintReadinessRulebook(parse(derived))).toEqual([]);
  });
});
