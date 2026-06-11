# Amendment AM-005 — `ocn sop upgrade` apply mode (forward-only SOP re-pin)

**Status**: Accepted (implemented)

## Date

2026-06-11

## Supersedes

None (additive extension of the frozen `ocn sop upgrade --plan` contract).

## Applies to

- `docs/06-api-contract.md` §10.1/§10.2/§23 — the frozen contract defines only the
  read-only `--plan` form ("No file write by default"). This amendment adds the
  **apply** form (no `--plan`), which mutates the project.
- `docs/05-data-model.md` §12.15 — audit taxonomy gains `sop_upgraded`
  (`sop_version_diff_detected` was already listed there; both are now wired into
  `src/types/audit.ts`).
- `src/core/sop/upgrade.ts`, `src/core/sop/snapshot.ts`, `src/cli/commands/sop.ts` (new)
- `src/core/sop/loader.ts`, `src/core/init.ts`, `src/types/audit.ts` (modified)

## Context

A project pins its SOP profile version at `ocn init`
(`state.json → project.sopProfileVersion` + the `.ocoding/*.yaml` snapshots). When the
installed package ships a newer profile (e.g. 0.4.0 with the readiness backbone,
AM-004), an existing project had **no path to it**: readiness commands blocked with
`ERR_SOP_VERSION` and suggested re-init, but `ocn init` refuses on an initialized
directory. The "no old projects exist" assumption recorded in AM-003's migration note
no longer holds — dogfooded repos initialized on 0.3.0 now exist and need the 0.4.0
gate. The stable-string-ID invariant (§4.1 of `CLAUDE.md`, `docs/00-project-brief.md`
§10) exists precisely to make this re-pin safe: progress is positional
(`currentStateId` / `currentStepId` / `artifacts`), so an upgrade only has to keep the
cursor valid and re-render the profile-owned snapshots.

## Divergence

`ocn sop upgrade [--target <version>] [--plan] [--json]`:

| Mode | Lock | Writes | Audit |
|---|---|---|---|
| `--plan` (frozen §23) | no | none | `sop_version_diff_detected` iff diff detected (§23.5) |
| apply (this amendment) | yes (`.ocoding/.lock`) | snapshots + `state.json` (atomic, backup) | `sop_upgraded` always on success |

Semantics (DEC-029):

1. **Forward-only.** Downgrades block with `ERR_SOP_VERSION` (exit 5); use a fresh
   `ocn init --sop-version <old>` for an older profile.
2. **Idempotent.** Target == pinned version is an `OK` no-op (exit 0, `applied: false`).
3. **Positional-cursor compatibility.** `currentStateId` and `currentStepId` must exist
   in the target profile, else `ERR_SOP_VERSION` naming the missing id. Steps added
   after the cursor become pending; steps added before it count as already passed
   (positional model — there is no `completedSteps` field). Unreachable for
   0.3.0 → 0.4.0 (identical step data); guards 0.5.0+.
4. **`config.yaml` is user-owned after init** and is preserved on upgrade (it carries
   `commands.build/test/test_list` for the readiness probes); it is only written when
   missing. The profile-owned snapshots (`sop.yaml`, `gates.yaml`, `artifacts.yaml`,
   `readiness-rules.yaml`) are rewritten unconditionally — incidentally healing
   snapshot drift.
5. **CLI-only / human-only.** Never exposed over MCP (CLAUDE.md §4.8 — same class as
   `advance`). `ocn sop version` / `ocn sop diff` remain backlog (OCN-2-SOP-VERSION).
6. The optional `--plan` save file (`.ocoding/upgrade-plan-<timestamp>.json`, §23.5)
   remains unimplemented — v1.0 does not require it.

## Verification

`tests/unit/sop-upgrade.test.ts` (9 cases incl. mid-pipeline cursor preservation,
config preservation, drift healing, audit event) +
`tests/cli/sop-upgrade.test.ts` (end-to-end: a 0.3.0 project upgrades and
`ocn readiness list` goes from exit 5 to exit 0).
