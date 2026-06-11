# Spike Report — AC→Test Trace (readiness P3)

> Date: 2026-06-11 · Branch: `feat/readiness-engine` · Status: **spike passed, shipped**
> Context: AM-004 named `each_acceptance_scenario_has_test_ref` the highest-risk derived
> predicate ("spike first"). This report records the spike's design, evidence, and limits.

## Question

Can the engine deterministically verify "every acceptance scenario has a real test" —
without an LLM, without trusting self-report, robust to naming conventions?

## Design (what shipped)

1. **Declared pointers (R1)** — the acceptance doc's `ocn-readiness` block declares the
   scenario IDs: `scenarios: ["AC-F01", "AC-F02"]`. IDs are parameters, not conclusions.
2. **Engine-collected reality (R2)** — the engine runs `commands.test_list`
   (e.g. `pytest --collect-only -q`, `npx vitest list`) and matches IDs against the
   **collected test node names only**. Comments are invisible to the collector — the
   red-team G1 cheat (`# AC-F01 AC-F02…` in a trivial test) is structurally dead.
3. **Token-sequence matching** — `AC-F01` → tokens `[ac, f01]`, matched as a consecutive
   token subsequence of the node name's tokens. Works across `test_ac_f01_x`,
   `test_AC_F01`, vitest's `scenario C plan rejected`; rejects the `f011` prefix collision.
4. **Open-world edges** — `test_list` unconfigured → UNKNOWN; no block / no `scenarios`
   field → UNKNOWN; **declared `[]` → UNKNOWN** (an empty list must not vacuously pass);
   lister crashes with no output → FAIL.

## Evidence

- Output-format assumption validated against a real `pytest --collect-only -q` run
  (Lattice venv): `tests/file.py::test_name` lines + `N tests collected` footer.
- End-to-end dogfood (fresh 0.4.0 project, real pytest as collector):
  - all declared scenarios traced → `rdy_qa_engineer` **PASS** (solo: 7 PASS / 0 FAIL / 2 UNKNOWN / 46 NA)
  - adding undeclared-by-tests `AC-F03` → **FAIL**, missing ID named in the detail
- 9 new unit/integration tests (collector parsing, matching, verdicts, shipped-rulebook
  qa flip, unconfigured-stays-UNKNOWN). Full suite 946/946.

## Known limits (accepted)

- **One-directional**: declared→collected only. Orphan detection (tests referencing
  undeclared IDs, OpenFastTrace-style) is a future refinement.
- **Declared-list gaming**: an AI could under-declare scenarios (1 ID for a 5-scenario
  doc). Prose carries no gate weight by design; mitigation would be a section↔block
  consistency lint — future work, noted in AM-004's remaining open points.
- **`each_scenario_has_impl_or_test_ref`** (team+): a test ref satisfies; impl-ref
  detection not yet implemented.
- Collection runs the project's lister (R4 command-freezing is P5).

## Verdict

The highest-risk predicate is implementable deterministically and cheaply
(~150 LOC + tests). Remaining solo-tier blocker after this spike: only
`rdy_service_desk_analyst` (README content extractor — small, separate item).
