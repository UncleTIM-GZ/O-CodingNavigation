# 0.3.0-beta.0 — ship the Logic Backbone (SOP 0.3.0)

> Date: 2026-06-04
> Branch: `release/0.3.0-beta.0-logic-backbone`
> Tag: `v0.3.0-beta.0`
> Status: prepared for publish as npm `latest` and `beta` (remains pre-GA beta)

---

## 1. Summary

Ships SOP **0.3.0** — additive over 0.2.0 — which adds the **Logic Backbone**: a
DESIGN-phase, machine-verifiable computation/decision graph. The npm package is
bumped `0.2.0-beta.2` → `0.3.0-beta.0`. `loadSopProfile()` now returns 0.3.0
(20 wired steps; `step_logic_backbone` is the last DESIGN step). 0.1.0 / 0.2.0
remain frozen and importable by explicit version. README, quickstart, MCP usage,
onepager, and CLAUDE.md updated for `0.3.0-beta.0`. `alpha` preserved at
`0.1.0-alpha.2`. This remains beta, not GA.

Authoritative design: AM-003 (`docs/amendments/2026-06-03-logic-backbone-amendment.md`),
DEC-025 (`docs/20-decision-log.md`). Feature PR: #74 (merged to `main`).

## 2. What the Logic Backbone does

The artifact `docs/07-logic-backbone.md` models a system as a typed, role-bearing
directed graph (DAG + DMN): node **kind** = input/formula/score/judgment/signal;
node **role** = input/intermediate/terminal_explanatory/trigger/hint; edges
(upstream→downstream) = feeds / serves / triggers / explains.

`ocn check` runs a structural gate after the required-section gate and **blocks**
(`ERR_ARTIFACT_INVALID`, exit 2) on any of: missing role, duplicate node id,
dangling reference, dependency cycle (Kahn topo), orphan node (role-aware
reachability), unbound trigger — naming each defect bilingually. On pass it writes
the normalized graph to `.ocoding/logic-graph.json` (machine source of truth), and
`ocn brief` folds the execution order + trigger bindings into the BUILD-phase
brief to prevent logic drift.

## 3. Surface changes

- `package.json`: `0.2.0-beta.2` → `0.3.0-beta.0` (version read at runtime, so
  `ocn --version` + MCP server metadata follow automatically).
- Runtime default profile: 0.2.0 → 0.3.0 (`src/core/sop/loader.ts`).
- `ocn doc create` registry: 19 → 20 types (adds `logic-backbone`).
- `navigator.create_artifact` MCP enum: +`logic-backbone` (still read+create only;
  advance / decisions / gate enforcement remain human-only).

## 4. Verification (pre-publish gate)

`npm run lint && npm run typecheck && npm run test:coverage && npm run build`
(the `prepublishOnly` gate) — see the publish checklist below. Feature-level
end-to-end: a mis-wired graph → BLOCKED naming every defect; a fixed graph →
PASS + `.ocoding/logic-graph.json`; `ocn brief` prints execution order + triggers.
Spawn-based CLI/e2e flows updated to walk all 20 steps (an `examples/plan-to-verify`
`07-logic-backbone.md` fixture was added).

## 5. Publish checklist (executed by a maintainer with npm auth)

1. `git switch release/0.3.0-beta.0-logic-backbone` (or merge its PR to `main` first).
2. `npm run lint && npm run typecheck && npm run test:coverage && npm run build`.
3. `npm pack` — verify the tarball contains the logic-backbone source + template.
4. `npm publish --tag latest` (this is `prepublishOnly`-gated). Then
   `npm dist-tag add o-coding-navigation@0.3.0-beta.0 beta`.
5. Annotated tag: `git tag -a v0.3.0-beta.0 -m "..."` and `git push origin v0.3.0-beta.0`.
6. Publish a GitHub **pre-release** for `v0.3.0-beta.0`.
7. Confirm `npm view o-coding-navigation dist-tags` shows `latest=beta=0.3.0-beta.0`,
   `alpha=0.1.0-alpha.2`.

> Auth note: publishing uses the token in `~/.npmrc` (the repo `.npmrc` carries no
> token). If it has expired (E401 / `npm whoami` fails), run `npm login` first; add
> `--otp=<code>` if 2FA is enabled. Governance: DEC-026.

## 6. GitHub pre-release notes (paste-ready)

> Title: **O'CodingNavigator v0.3.0-beta.0** · mark as **pre-release**.

```markdown
## O'CodingNavigator v0.3.0-beta.0 — Logic Backbone

> Pre-GA beta. `npm install -g o-coding-navigation@0.3.0-beta.0`
> (npm `latest` + `beta`; `alpha` stays at `0.1.0-alpha.2`).

### New — Logic Backbone (SOP 0.3.0)

A new DESIGN-phase artifact, `docs/07-logic-backbone.md`, pins a system's
**computation/decision graph** before BUILD so the logic can't drift. It models
the system as a typed, role-bearing directed graph (DAG + DMN): node kinds
(input / formula / score / judgment / signal), node roles (input / intermediate /
terminal_explanatory / trigger / hint), and edges (feeds / serves / triggers /
explains).

`ocn check` machine-validates the graph and **blocks** (`ERR_ARTIFACT_INVALID`,
exit 2) on:

- a node missing a valid **role**
- a **duplicate** node id
- a **dangling reference** (edge to an undefined node)
- a dependency **cycle**
- an **orphan** node (an input/intermediate nothing consumes)
- an **unbound trigger** (a `trigger` with no `triggers` edge to a target)

On pass it writes `.ocoding/logic-graph.json` (machine source of truth), and
`ocn brief` folds the **execution order + trigger bindings** into the BUILD-phase
brief.

### Changed

- Runtime default SOP profile: **0.3.0** (= 0.2.0 + `step_logic_backbone`); the
  pipeline now has **20 wired steps**. 0.1.0 / 0.2.0 remain frozen and importable
  by explicit version.
- `ocn doc create` registry and the `navigator.create_artifact` MCP tool gain the
  `logic-backbone` type.

### Verification

`lint` + `typecheck` + `test:coverage` (897 tests, 102 files) + `build`, green.

Design: AM-003 + DEC-025. Release: DEC-026. Feature PR #74, release PR #75.
```
