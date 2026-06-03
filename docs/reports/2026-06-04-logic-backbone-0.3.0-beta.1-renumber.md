# 0.3.0-beta.1 — republish with the logic-backbone renumber

> Date: 2026-06-04
> Branch: `release/0.3.0-beta.1-renumber`
> Tag: `v0.3.0-beta.1`
> Status: published as npm `latest` and `beta`

---

## 1. Summary

`0.3.0-beta.0` was published with the logic backbone in an **additive slot
`docs/19`** (last DESIGN step). Review showed that placement is dependency-
incorrect, so the artifact was moved to its **dependency-correct slot
`docs/07-logic-backbone.md`** (after the data model, before the API contract and
test strategy); `08-api-contract` … `19-final-build-verdict` shift +1. Because
npm versions are immutable, the corrected build ships as `0.3.0-beta.1`.

Authoritative design: AM-003, DEC-025, **DEC-027** (the renumber). Feature PR #74;
renumber PR #77.

## 2. What changed vs beta.0

- `step_logic_backbone` workflow position: last DESIGN step → **after `06-data-model`,
  before `08-api-contract` / `09-test-strategy`**. File slot `19` → **`07`**; downstream
  artifacts shift +1.
- `ocn doc create` now sources the artifact path from the active SOP profile
  (`artifactPathForStep`), not a hardcoded registry path.
- No CLI/API surface change; the 20-step default flow and the logic-backbone gate
  behave identically — only the ordering/numbering is corrected.

## 3. Verification

`lint` + `typecheck` + `test:coverage` (897 tests, 102 files) + `build`, green. Codex
independently reviewed the renumber (7 areas clean).

## 4. Publish checklist (executed)

1. `npm publish --tag latest` (prepublishOnly-gated).
2. `npm dist-tag add o-coding-navigation@0.3.0-beta.1 beta`.
3. Annotated tag `v0.3.0-beta.1`; GitHub pre-release.
4. Confirm `npm view o-coding-navigation dist-tags` → `latest=beta=0.3.0-beta.1`,
   `alpha=0.1.0-alpha.2`.
