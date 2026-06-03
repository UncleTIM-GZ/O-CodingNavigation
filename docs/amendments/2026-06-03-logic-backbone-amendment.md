# Amendment AM-003 — Logic Backbone (machine-verifiable computation/decision graph)

**Status**: Active (SOP 0.3.0 — additive, default flip deferred)

## Date

2026-06-03

## Supersedes

None (new artifact + new SOP minor version).

## Applies to

- `src/types/logic-backbone.ts` (new zod schema: LogicNode / LogicEdge / LogicGraph + kind/role/edge enums)
- `src/core/id.ts` (new node-id prefixes: `input_` `formula_` `score_` `judgment_` `signal_`)
- `src/core/artifact/logic-backbone-parser.ts` (extract + parse the embedded graph)
- `src/core/gate/logic-backbone-validator.ts` (the five drift checks)
- `src/core/gate/logic-backbone-gate.ts` (parser + validator orchestration)
- `src/core/gate/gate-runner.ts` (structural gate chained after the section gate for `step_logic_backbone`)
- `src/core/logic/logic-graph-store.ts`, `logic-graph-summary.ts` (`.ocoding/logic-graph.json` projection + brief summary)
- `src/core/templates/logic-backbone.ts` + registry (`docs/19-logic-backbone.md`)
- `src/sops/default-ai-coding-sop/0.3.0/*` (new profile = 0.2.0 + `step_logic_backbone`)
- `src/core/sop/loader.ts` (0.3.0 ProfileSource; default stays 0.2.0)
- `src/mcp/tools/create-artifact.ts` (`logic-backbone` enum value)
- `src/core/brief.ts`, `src/cli/render/text.ts` (anti-drift backbone summary)

## Context

Across many OCN-governed systems the briefing reads as "complete" — modules, metrics,
and formulas are all listed — yet the system's **computation/decision logic is implicit**:
nothing pins what computes first, which formula serves which judgment, which score feeds
the next layer vs. is only explanatory, or which signal drives a function vs. is only a
hint. Because the logic backbone is never made explicit at design time, the
implementation **drifts and compounds**. OCN's state machine prevents *phase* drift; it
had nothing preventing *logic* drift. This is a new class of false-completion:
**structurally complete, logically un-wired.**

The established software-engineering fix is to make the implicit graph explicit — a typed,
role-bearing directed graph that is the single source of truth and is machine-validated
(dbt's `ref()` DAG with cycle/dangling failure; DMN's decision-requirements layering;
Event Modeling's command-vs-read-model distinction; architectural fitness functions).

## Decision

Add a DESIGN-phase artifact **`artifact_logic_backbone`** (step `step_logic_backbone`),
authored as `docs/19-logic-backbone.md`. It carries five required sections (Nodes,
Dependencies, Decision Bindings, Signals, Graph) and an embedded `ocn-logic-graph` fenced
block (YAML). The graph models:

- **node kind**: input / formula / score / judgment / signal
- **node role** (required): input / intermediate / terminal_explanatory / trigger / hint
- **edge** (upstream→downstream): `feeds` / `serves` / `triggers` / `explains`

`ocn check` runs a structural gate after the section gate and **blocks
(`ERR_ARTIFACT_INVALID`, exit 2)** on any of five defects: missing role, dangling
reference, dependency cycle (Kahn topo sort over driving edges), orphan node (an
input/intermediate with no downstream consumer), and unbound trigger. On pass it persists
a normalized projection to `.ocoding/logic-graph.json` (machine source of truth, per
§4.10), which `ocn brief` summarizes (execution order + trigger bindings) so BUILD-phase
prompts always see the logic spine.

**Two sub-decisions:**

1. **Additive slot 19, no renumbering.** The 0.2.0 profile already occupies `docs/00–18`
   and the template registry maps one path per type; renumbering would force version-aware
   paths and break the frozen 0.2.0 suite. `step_logic_backbone` is ordered as the **last
   DESIGN step** (step order is the source of truth; file number is display-only per §4.1).
2. **New SOP version 0.3.0, default deferred.** Adding a step is an additive minor bump
   (§4.2): 0.2.0 stays frozen. The runtime default remains 0.2.0; 0.3.0 ships fully
   implemented and tested, flip-ready — mirroring how 0.2.0 itself was staged (data+gate
   first, default flip as a separate PR).

## Impact

- Projects pinning 0.3.0 gain a mandatory, machine-checked logic backbone before BUILD.
- Five new node-id prefixes; one new artifact/step/template; one new `.ocoding/` file.
- No breaking change to 0.2.0 or 0.1.0 projects (additive, version-isolated).
- `navigator.create_artifact` MCP tool widened by one enum value (state advancement,
  gate enforcement, and decisions remain human-only per §4.8).

## Migration note

To make the backbone enforced under the bare `ocn` CLI, a follow-up PR must flip the
runtime default to 0.3.0 (updating the "19/20 wired steps" and default-version
assertions), OR teach `loadSopProfile()` to resolve the version from the project's
`.ocoding/config.yaml`. Until then, the gate is reachable via an explicit 0.3.0 profile
(used by `tests/unit/logic-backbone-gate-runner.test.ts`).

## References

- DEC-025 (this amendment's decision-log entry).
- Plan: `~/.claude/plans/ocn-ocn-briefing-synthetic-babbage.md`.
