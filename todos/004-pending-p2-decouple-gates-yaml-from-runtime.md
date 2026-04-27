---
status: pending
priority: p2
issue_id: 004
tags: [code-review, architecture, false-promise]
dependencies: []
---

# Decide: parse `gates.yaml` at runtime, or remove its on-disk write

## Problem Statement

`ocn init` writes `.ocoding/gates.yaml` and `.ocoding/sop.yaml` from bundled string constants, but `loadSopProfile()` returns a hardcoded `PRD_REQUIRED_SECTIONS` array (`src/core/sop/loader.ts:21-45`). The on-disk YAML is **decorative** — editing `.ocoding/gates.yaml` does nothing to actual gate behavior.

Users who follow the artifact tree and customize `gates.yaml` will silently lose changes — a false promise of customizability.

## Findings

- `src/core/sop/loader.ts:55-56` returns `PRD_REQUIRED_SECTIONS` regardless of `.ocoding/gates.yaml` contents.
- `src/sops/default-ai-coding-sop/0.1.0/gates.ts` is a string constant; `gatesYaml` is written verbatim by `init.ts:75`.
- Source: architecture-strategist review, P1-1; also implementation-notes.md L4 (partial coverage).

## Proposed Solutions

### Option A — Parse `gates.yaml` at runtime (true source of truth)

Add `js-yaml` parse in `loadSopProfile(cwd)` that reads `Paths.gatesFile(cwd)` and constructs `PRD_REQUIRED_SECTIONS` from it.

- Pros: makes the on-disk yaml the SoT; users can customize.
- Cons: needs YAML schema validation (zod), error handling for malformed YAML, version bump implications.
- Effort: Medium

### Option B — Remove the on-disk YAML writes for now

Document it explicitly: "Skeleton Spike does not yet honor user edits to `.ocoding/gates.yaml`. Edit `src/sops/default-ai-coding-sop/0.1.0/gates.ts` to change defaults."

- Pros: zero code, no false promise.
- Cons: temporarily loses the "user can inspect their profile" value of having yaml on disk.

### Option C — Keep writing yaml, but tag it clearly

Prepend `# READONLY — generated, do not edit. See gates.ts in package source.` to the bundled string. Add a Phase 2 todo to flip it to authoritative.

- Pros: minimal change, sets expectations.
- Cons: still a half-promise, but explicitly so.

**Recommended: Option C** for Skeleton Spike (small, honest), with Option A as Phase 2 work.

## Technical Details

- Affected files: `src/sops/default-ai-coding-sop/0.1.0/{sop,gates,artifacts,config}.ts` (prepend READONLY header).
- Optional: update `implementation-notes.md` L4 with this decision.

## Acceptance Criteria

- [ ] Bundled YAML strings carry an unambiguous "do not edit" header.
- [ ] `implementation-notes.md` L4 updated with the decision.
- [ ] Phase 2 plan captures the "parse at runtime" follow-up.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P1-1
- `implementation-notes.md` §1 L4
