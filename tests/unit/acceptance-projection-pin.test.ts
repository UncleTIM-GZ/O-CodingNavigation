import { describe, expect, it } from "vitest";
import { evaluateAcceptanceSpecs } from "../../src/core/acceptance/acceptance-gate.js";
import { buildAcceptanceProjection } from "../../src/core/acceptance/acceptance-spec-store.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";

// SOP 0.9.0 (AM-016) — AC-16: the acceptance projection is pin-aware. Only a
// 0.9.0+ profile emits v2 (kind/measure). A <0.9.0 pin with `kind:outcome` in
// docs must still get a v1 projection (outcome kind dropped) + a warn, which
// keeps every downstream consumer byte-identical AND holds the gate-runner's
// outcome-freeze bypass (keyed on version === 2) dormant.

const WITH_OUTCOME: readonly AcceptanceSpecV2[] = [
  { kind: "build", id: "AC-INIT-001", desc: "init lands .ocoding", trace: [] },
  {
    kind: "outcome",
    id: "AC-CORE-003",
    desc: "onboarding under 30m",
    trace: [],
    measure: {
      command: "node probe.js",
      threshold: { op: ">=", value: 1 },
      source: "cases/*.json",
      due: "state_ship",
      timeoutSeconds: 60,
    },
  },
];

const DOC_WITH_OUTCOME = [
  "# Acceptance Criteria",
  "",
  "## Acceptance Specs｜验收规格",
  "",
  "### AC-INIT-001",
  "- desc: init lands .ocoding",
  "",
  "### AC-CORE-003",
  "- desc: onboarding under 30m",
  "- kind: outcome",
  "- measure.command: node probe.js",
  "- measure.threshold: >= 1",
  "- measure.source: cases/*.json",
  "- measure.due: state_ship",
  "- measure.timeout: 60",
  "",
].join("\n");

describe("buildAcceptanceProjection pin awareness (AC-16)", () => {
  it("outcomeCapable=false downgrades an outcome spec to a v1 projection", () => {
    const projection = buildAcceptanceProjection(WITH_OUTCOME, "hash", false);
    expect(projection.version).toBe(1);
    expect(projection.items.every((i) => !("kind" in i))).toBe(true);
  });

  it("outcomeCapable=true (default) promotes an outcome spec to v2", () => {
    expect(buildAcceptanceProjection(WITH_OUTCOME, "hash", true).version).toBe(2);
    expect(buildAcceptanceProjection(WITH_OUTCOME, "hash").version).toBe(2);
  });
});

describe("evaluateAcceptanceSpecs pin awareness (AC-16)", () => {
  it("a <0.9.0 pin emits v1 + a warn when docs carry an outcome AC", () => {
    const outcome = evaluateAcceptanceSpecs(DOC_WITH_OUTCOME, false);
    expect(outcome.ok).toBe(true);
    expect(outcome.projection?.version).toBe(1);
    expect(outcome.message.en).toContain("SOP 0.9.0");
    expect(outcome.message.zh).toContain("0.9.0");
  });

  it("a 0.9.0 pin freezes v2 with no downgrade warn", () => {
    const outcome = evaluateAcceptanceSpecs(DOC_WITH_OUTCOME, true);
    expect(outcome.ok).toBe(true);
    expect(outcome.projection?.version).toBe(2);
    expect(outcome.message.en).not.toContain("SOP 0.9.0");
  });
});
