# Information Architecture｜信息架构

> Step: `step_information_architecture` (artifact-only in v1.0 SOP — gate auto-passes when this file exists).
> This file is part of the `examples/discovery-to-plan/` walkthrough. Run `examples/discovery-to-plan/scripts/smoke.sh` to exercise it end-to-end.

## Object map｜对象图

- **Project** — owns its `.ocoding/state.json`, the bundled SOP profile snapshot, and its docs tree.
- **State** — one of the 8 stable IDs (`state_discovery` … `state_reflect`). One project is in exactly one state at a time.
- **Step** — owned by a state. Has zero or one required artifact + zero or more required sections.
- **Artifact** — a Markdown document under `docs/` whose filename and headings are matched against a `RequiredSectionDef[]` set.

## Pointers｜指针

- The runtime profile (`src/sops/default-ai-coding-sop/0.1.0/data.ts`) is the single source of truth.
- The persisted snapshot (`.ocoding/{sop,gates,artifacts}.yaml`) is rendered from the same data; legacy snapshots are reported by `detect_sop_version` as `snapshot_legacy` (P1-003).

## Notes for this example

This example only commits `docs/` fixtures — no `.ocoding/` directory. The real `.ocoding/` is generated freshly by `ocn init` inside a temporary project in the smoke script.
