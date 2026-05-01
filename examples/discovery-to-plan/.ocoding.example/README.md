# `.ocoding.example/`

This directory is **deliberately empty** of real OCN state.

A real `.ocoding/` (note: the actual runtime directory does NOT have the `.example` suffix) contains:

```
.ocoding/
├── state.json          # current state/step pointer + project info (atomic-write protected)
├── state.json.bak      # most-recent backup, written before each successful state.json mutation
├── sop.yaml            # canonical SOP profile snapshot, rendered from data.ts (P1-003)
├── gates.yaml          # per-step required-section gates, rendered from the same data
├── artifacts.yaml      # per-step artifact path map, rendered from the same data
├── config.yaml         # tier + language defaults
├── .lock               # ephemeral file-lock; exists only inside acquireLock → releaseLock
└── audit/              # append-only audit trail (jsonl + rolled markdown summary)
```

This example **does not commit any of those files** because:

1. **`ocn init` writes them.** Committing a static snapshot would diverge from what `ocn init` would produce in this same directory at any given commit, defeating the purpose of the example.
2. **`.ocoding/state.json` carries an atomic-write protocol** (lock + backup + temp + rename, see `src/core/state/state-store.ts`). Committing one is a recipe for accidentally putting users into half-written or otherwise inconsistent state.
3. **A user running `ocn init` *inside* this example directory would corrupt the bundled state if it existed.** The `.example` suffix on this directory's name keeps it inert: `ocn init` does not look at it.

To actually see what `ocn init` produces, run the smoke script from the example root:

```bash
bash examples/discovery-to-plan/scripts/smoke.sh
```

The smoke creates a temporary project under `mktemp -d`, runs `ocn init` there, and walks the resulting `.ocoding/` through `status` / `check` / `gate` / `advance`. Inspect the temp project after the smoke runs (the script prints its absolute path).

## Why this directory exists at all

To document, in the example's own tree, the **shape** of `.ocoding/` without committing the **contents**. This is the policy chosen in `docs/plans/2026-04-29-ga-prep-pr-f-examples-directory-plan.md` §5.
