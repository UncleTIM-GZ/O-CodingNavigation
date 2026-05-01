# SOP Snapshot ↔ Runtime Profile Sync (P1-003)｜SOP 持久化与运行时一致

> Date: 2026-04-30
> Audit reference: `docs/reports/2026-04-30-post-alpha-codex-audit.md` §3 P1-003
> Caveat: External MCP Host Validation pending. PR D not started, no real Claude Desktop / Cursor / Cline verification has been performed.

---

## 1. Summary

Closes P1-003 from the post-alpha Codex audit. Before this PR, `ocn init` persisted a Skeleton-Spike-era snapshot of `sop.yaml` and `gates.yaml` that mentioned only `state_spec / step_prd`, while the runtime SOP loader (`src/core/sop/loader.ts`) actually exposed eight states and ten defined steps — `state_discovery` through `state_reflect`, `step_project_brief` through `step_mvp_plan`. This drift undermined SOP trust, made `detect_sop_version` blind to content divergence, and let two earlier P1s (P1-002 doc-hint suggestions, P1-004 version surface) ride alongside a stale on-disk profile.

The fix consolidates the canonical profile data into a single module (`src/sops/default-ai-coding-sop/0.1.0/data.ts`), drives both the runtime loader and the persisted YAML strings from that module via a deterministic renderer, and persists `artifacts.yaml` for the first time so the on-disk snapshot fully expresses the runtime profile. `detect_sop_version` now reports a structured `snapshotDriftDetected` signal (`snapshot_in_sync` / `snapshot_legacy` / `snapshot_missing` / `snapshot_unreadable`) so callers can see content drift even when the locked semver matches.

No version bump, no npm publish, no dist-tag change, no caveat removal.

## 2. Codex P1-003 finding (verbatim from audit report)

```
Finding:
  ocn init persists a minimal/skeleton SOP YAML while the runtime loader exposes a
  DISCOVERY → PLAN multi-step profile. The persisted snapshot only contains
  state_spec / step_prd shaped data, but loader.ts surfaces many more states/steps.

Evidence:
  src/core/init.ts:97
  src/core/sop/loader.ts:15
  src/sops/default-ai-coding-sop/0.1.0/sop.ts:3
  src/sops/default-ai-coding-sop/0.1.0/artifacts.ts:1
  src/sops/default-ai-coding-sop/0.1.0/gates.ts:1

Impact:
  detect_sop_version may not catch divergence between persisted project SOP and
  runtime behaviour. This undermines SOP trust, profile upgrade semantics, and any
  downstream tooling that reads .ocoding/sop.yaml as the source of truth.

Recommendation:
  Make persisted SOP snapshot and runtime SOP profile consistent — generate persisted
  YAML from the same authoritative step map — or clearly define runtime-profile
  override semantics with explicit detection. Test parity between persisted snapshot
  and runtime loader.

Suggested PR:
  fix/sync-persisted-sop-snapshot-with-runtime-profile
```

## 3. Before / after

### `.ocoding/sop.yaml`

Before (Skeleton Spike snapshot — verbatim):

```yaml
profile: default-ai-coding-sop
version: 0.1.0
schemaVersion: "1.0"
states:
  - id: state_spec
    name: SPEC
    purpose: Form structured PRD and acceptance criteria
    steps:
      - step_prd
```

After (canonical rendering — covers the full eight-state lattice; abbreviated):

```yaml
profile: default-ai-coding-sop
version: 0.1.0
schemaVersion: "1.0"
states:
  - id: state_discovery
    name: DISCOVERY
    purpose: Frame the problem, scope, and project brief.
    steps:
      - step_project_brief
      - step_scope
  - id: state_spec
    …
  - id: state_design
    …
  - id: state_plan
    …
  - id: state_build
    name: BUILD
    purpose: Implement the plan; step ids land in a future PR.
    steps: []
  - id: state_verify
    …
  - id: state_ship
    …
  - id: state_reflect
    …
```

### `.ocoding/gates.yaml`

Before — only `step_prd` had a gate definition. After — all five steps with required sections (`step_project_brief`, `step_scope`, `step_prd`, `step_acceptance_criteria`, `step_technical_architecture`) plus stub entries (`requiredSections: []`) for the five v1.0 steps that defer their gates to a later PR.

### `.ocoding/artifacts.yaml` (NEW — persisted for the first time)

Before — never written by `ocn init`. After — every step that has an artifact path gets an explicit entry:

```yaml
artifacts:
  artifact_project_brief:
    path: docs/00-project-brief.md
    requiredForSteps:
      - step_project_brief
  artifact_scope:
    path: docs/01-scope.md
    …
  artifact_mvp_plan:
    path: docs/09-mvp-plan.md
    requiredForSteps:
      - step_mvp_plan
```

### `detect_sop_version`

Before — only compared the locked `sopProfileVersion` against the bundled profile's semver; both were `0.1.0`, so it always returned `diffDetected: false` regardless of content drift. After — adds two new fields:

```ts
readonly snapshotDriftDetected: boolean;
readonly snapshotDriftReason: "snapshot_in_sync" | "snapshot_missing" | "snapshot_unreadable" | "snapshot_legacy";
```

The legacy Skeleton snapshot above is now reported as `snapshot_legacy` even when the semver still matches.

## 4. Implementation strategy

The canonical data module is the single source of truth. Both the runtime loader and the persisted YAML serializers consume it.

```
                          ┌────────────────────────────────────┐
                          │ src/sops/default-ai-coding-sop/    │
                          │   0.1.0/data.ts                    │
                          │   - PROFILE_ID / PROFILE_VERSION   │
                          │   - STATE_DEFS (id, name, purpose) │
                          │   - STEPS_BY_STATE (artifact path) │
                          │   - REQUIRED_SECTIONS_BY_STEP      │
                          └─────────────┬──────────────────────┘
                                        │
                ┌───────────────────────┴─────────────────────────┐
                │                                                 │
                ▼                                                 ▼
   src/core/sop/loader.ts                  src/sops/default-ai-coding-sop/0.1.0/render.ts
   - loadSopProfile() returns                - renderSopYaml()
     SopProfile{ stateOrder, ...,            - renderGatesYaml()
     requiredSectionsForStep, ... }          - renderArtifactsYaml()
                │                                                 │
                │                                                 ▼
                │                            src/sops/default-ai-coding-sop/0.1.0/sop.ts
                │                            src/sops/default-ai-coding-sop/0.1.0/gates.ts
                │                            src/sops/default-ai-coding-sop/0.1.0/artifacts.ts
                │                            (each re-exports the rendered string)
                │                                                 │
                ▼                                                 ▼
   ocn check / gate / status / brief …                 ocn init writes the strings to
                                                       .ocoding/{sop,gates,artifacts}.yaml
```

A separate `canonicalSopSnapshotSignals()` helper in `render.ts` exposes the canonical state/step ids so `detect_sop_version` can detect drift without parsing the YAML.

## 5. New init snapshot fields

| Field | Source | Notes |
| --- | --- | --- |
| `profile`, `version`, `schemaVersion` | data.ts (`PROFILE_ID`, `PROFILE_VERSION`, `SCHEMA_VERSION`) | Stable strings; renames are SOP version breaks. |
| `states[].id` / `name` / `purpose` | `STATE_DEFS` | Same canonical order as `STATE_ORDER`. |
| `states[].steps[]` | `STEPS_BY_STATE` | Empty list for state stubs (BUILD/VERIFY/SHIP/REFLECT). |
| `gates.<step>.requiredSections[]` | `REQUIRED_SECTIONS_BY_STEP` | Section ids only — alias data stays in `data.ts` (loader-internal matcher detail). |
| `artifacts.<artifact>.path` | `STEPS_BY_STATE[*].artifactPath` | Project-relative path; matches `profile.artifactPathForStep`. |
| `artifacts.<artifact>.requiredForSteps[]` | derived | One artifact ↔ one step in v1.0. |

`InitData.artifactsFile` is added so callers can surface the path; existing `stateFile` / `sopFile` / `gatesFile` / `configFile` / `docsDir` are unchanged.

## 6. Loader / detect-version behaviour

- `loadSopProfile()` — same SopProfile interface, no signature change. Internally it now reads `STATE_ORDER`, `STEPS_BY_STATE`, and `REQUIRED_SECTIONS_BY_STEP` from `data.ts` (eliminating the duplicate copies that previously lived in `loader.ts`).
- `runGate` / `checkCurrentArtifact` / `getStatus` / `generateBrief` / `runAdvance` — unchanged. They consume the SopProfile contract; the canonical data move is invisible to them.
- `detectSopVersion` — same input shape, new output fields (`snapshotDriftDetected`, `snapshotDriftReason`). Existing tests (`diffDetected: false` for fresh init) still pass; new tests pin the four drift reasons.
- The persisted YAML files are still **snapshots, not runtime sources**. The loader does not parse them. Switching to a parsed-from-YAML runtime is a P2 concern (see Non-goals §10).

## 7. Backward compatibility for legacy snapshots

Existing projects sitting on a pre-P1-003 `.ocoding/sop.yaml` keep working:

- `ocn status`, `ocn brief`, `ocn check`, `ocn gate`, `ocn advance` all use the runtime profile from `loadSopProfile()`, not the on-disk YAML. None of them hit the legacy snapshot. They continue to behave correctly on legacy projects.
- `ocn detect_sop_version` on a legacy project now reports `diffDetected: false`, `snapshotDriftDetected: true`, `snapshotDriftReason: "snapshot_legacy"`, with a bilingual message that suggests refreshing the snapshot via a fresh `ocn init` in a new directory. We deliberately do **not** auto-rewrite a user's `.ocoding/sop.yaml` — that would silently mutate state outside an explicit user action (CLAUDE.md §10 forbids modifying `.ocoding/state.json` directly; the same caution applies to peer files).
- Missing `.ocoding/sop.yaml` → `snapshot_missing`. Unreadable → `snapshot_unreadable`. Both are reported, neither crashes.

## 8. Tests added (16 new; full suite 433 → 449 passing, zero regressions)

- `tests/unit/sop-render.test.ts` — 8 new tests pinning the renderer:
  - sop.yaml header has profile / version / schemaVersion
  - sop.yaml lists all 8 states in canonical order
  - sop.yaml lists every v1.0 step
  - gates.yaml has a gate entry for every v1.0 step
  - gates.yaml expands required sections for the 5 step gates that have them
  - artifacts.yaml maps every step's artifact path
  - `loadSopProfile().sopYaml === renderSopYaml()` (and the same for gates/artifacts) — single-source pin
  - `canonicalSopSnapshotSignals()` covers every state and step
  - The legacy Skeleton snapshot fails ≥ 8 canonical signals — guards against regressing `data.ts`
- `tests/unit/sop-loader.test.ts` — 2 new tests on the loader (states + steps coverage; artifact path parity between `artifactPathForStep` and `artifactsYaml`).
- `tests/unit/core-init.test.ts` — 1 new test (`persists a canonical sop.yaml/gates.yaml/artifacts.yaml that mirrors the runtime profile`) plus 1 addition to the existing init test verifying `artifacts.yaml` is written.
- `tests/cli/init.test.ts` — 1 new test (persisted `sop.yaml` covers every v1.0 state and step) plus an `await fs.access(.../artifacts.yaml)` in the existing happy-path test.
- `tests/unit/mcp-detect-sop-version.test.ts` — 3 new tests (`snapshot_in_sync` after fresh init, `snapshot_legacy` when `.ocoding/sop.yaml` is rewritten to the historical Skeleton, `snapshot_missing` when the file is deleted).

## 9. Local validation

```
npm run lint           PASS
npm run typecheck      PASS
npm run test           PASS (449 / 449)
npm run test:coverage  PASS — overall 83.49% (≥80%); data.ts 100%; render.ts 100%
npm run build          PASS

# Smoke: init produces canonical snapshot + status/brief still resolve
$ TMP=$(mktemp -d) && cd "$TMP"
$ node dist/cli/index.js init
$ head -7 .ocoding/sop.yaml
profile: default-ai-coding-sop
version: 0.1.0
schemaVersion: "1.0"
states:
  - id: state_discovery
    name: DISCOVERY
    purpose: Frame the problem, scope, and project brief.
$ node dist/cli/index.js status   # → state_discovery / step_project_brief, current artifact docs/00-project-brief.md
$ node dist/cli/index.js brief    # → bilingual brief, current artifact status missing, blockers section_problem/goal/users/success_criteria
```

## 10. Non-goals (deliberately out of scope)

- No version bump, no npm publish, no dist-tag change, no git tag, no GitHub release.
- **Loader parses YAML** — out of scope. The persisted files are snapshots; the runtime profile is bundled-in TS. Switching the loader to parse `.ocoding/sop.yaml` adds a real YAML parser dependency, schema validation, profile-version negotiation, and override semantics — all P2 territory. This PR makes the snapshot honest; future PRs can evolve the loader.
- **Auto-migration of legacy `.ocoding/sop.yaml` snapshots** — out of scope. Mutating user state silently is contrary to CLAUDE.md §10. `detect_sop_version` reports the drift; the user can reset the snapshot deliberately.
- **Aliases in persisted gates.yaml** — out of scope. Aliases are matcher-internal (e.g. `Scenarios｜使用场景`); persisting them in YAML would couple display detail to the snapshot schema. Section ids alone are sufficient for parity.
- No README / quickstart copy changes — none of their visible claims contradicted the runtime profile (the README has always described the full DISCOVERY → REFLECT lattice).
- No changes to `package.json` version / name. No `package-lock.json` change.
- External MCP Host Validation remains **pending**. This PR makes the on-disk SOP snapshot faithful to the runtime; it does not validate against any real MCP host.
- No PR D, no beta promotion, no P2 work.
