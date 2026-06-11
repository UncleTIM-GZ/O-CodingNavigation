# Amendments｜修订记录

> Long-term governance directory for divergences from OCN's frozen design docs (`docs/00-08`).
> Policy: [DEC-004 — Frozen Design Docs Amendment Policy](../20-decision-log.md#dec-004frozen-design-docs-amendment-policy).
> Numbering policy companion: [DEC-003 — Documentation Numbering Policy after SOP v1.1](../20-decision-log.md#dec-003documentation-numbering-policy-after-sop-v11-technical-architecture-insertion).

---

## 1. Purpose

Amendments record decisions that **supersede** the locked design docs (`docs/00-08`) without rewriting them. Each future PR that introduces a structural divergence appends a new amendment file rather than editing the frozen baseline.

This directory is the **single source of truth for active divergences** between `docs/00-08` and the implementation as it stands today. A reader who finds a path / schema / contract in `docs/00-08` should consult this index to see whether an amendment supersedes it.

---

## 2. When to create an amendment

Create a new amendment file when *any* of the following changes:

- **Document slot numbering changes** — e.g. moving `docs/19-decision-log.md` → `docs/20-decision-log.md`.
- **Canonical path changes** — e.g. moving `.ocoding/events/audit-events.jsonl` → `.ocoding/audit/audit-events.jsonl`.
- **Data model / schema changes** — adding, renaming, or removing fields, enums, types in `docs/05-data-model.md`.
- **API contract changes** — new commands, new exit codes, renamed flags, changed envelope shapes affecting `docs/06-api-contract.md`.
- **SOP profile changes** — new states, new steps, changed step ordering, new required sections.
- **Storage layout changes** — file paths, directory structure, lock semantics.
- **Scope changes** — adding or removing items from `docs/01-scope.md` § *must / must-not*.
- **Frozen design docs contain historical-but-now-superseded references** — i.e. paths or names that drift after a structural change elsewhere.

A change qualifies if it would have *invalidated* the original design doc text had it been written that way originally. Apply the rule:

> *Does this change the meaning, paths, schemas, or scope of a frozen doc?*
> If **yes** → write an amendment.
> If **no** → see §3.

---

## 3. When NOT to create an amendment

Direct in-place edits to `docs/00-08` are permitted (per DEC-004) for the following — no amendment needed:

- Typos / spelling corrections.
- Broken internal links that point to the *same* artifact's new canonical location.
- Markdown formatting fixes (table alignment, fenced-code language tags, heading levels) that do not change rendered meaning.
- Pure copy-edits that don't alter what a section means.
- Non-semantic wording improvements.

If unsure, write the amendment. The cost of an extra amendment file is small; the cost of a quietly-rewritten frozen doc is high.

---

## 4. Forbidden edits (regardless of size)

Never permitted on frozen docs, even as "small fixes":

- Large-scale rewrites that present the frozen doc as if it had always been correct.
- Deletion of historical decision context (e.g. rejected options, deferred items).
- Overwriting evidence of dogfood-period failures or constraints.
- Bulk find-and-replace across `docs/00-08` for cosmetic consistency. **Path moves go into amendments.**

---

## 5. Current amendments

Active divergences from `docs/00-08`. Listed newest-first by amendment ID.

| ID | Date | Title | Status | Supersedes | Applies to |
|---|---|---|---|---|---|
| [AM-005](./2026-06-11-sop-upgrade-apply-amendment.md) | 2026-06-11 | `ocn sop upgrade` apply mode (forward-only SOP re-pin) | Accepted | None (extends frozen §23 `--plan`-only contract) | `docs/06-api-contract.md` §10/§23, `docs/05-data-model.md` §12.15, `src/core/sop/upgrade.ts`, `src/cli/commands/sop.ts` |
| [AM-004](./2026-06-11-readiness-backbone-amendment.md) | 2026-06-11 | Readiness Backbone (role-based cross-cutting readiness gate, SOP 0.4.0) | Accepted | None (additive) | `sops/default-ai-coding-sop/0.4.0/*`, `src/core/readiness/*`, `src/core/gate/readiness-gate.ts`, `docs/05`/`06` (gate + audit additions) |
| [AM-003](./2026-06-03-logic-backbone-amendment.md) | 2026-06-03 | Logic Backbone (machine-verifiable computation/decision graph, SOP 0.3.0) | Active | None (additive) | `docs/07-logic-backbone.md` slot (doc renumber), `src/core/gate/logic-backbone-validator.ts`, SOP 0.3.0 profile |
| [AM-002](./2026-04-28-decision-log-path-amendment.md) | 2026-04-28 | Decision-log canonical path move (`19-` → `20-`) | Accepted | `docs/19-decision-log.md` (path) | `docs/00-08` (references), plans, `CLAUDE.md`, `.claude/rules.md`, `.claude/anti-patterns.md`, `implementation-notes.md` |
| [AM-001](./2026-04-28-audit-storage-path-amendment.md) | 2026-04-28 | Audit storage path reconciliation (`events/` → `audit/`, `docs/21-` → `docs/22-`) | Active | `docs/05-data-model.md` (audit paths), `docs/06-api-contract.md` (audit paths) | `src/core/audit/audit-paths.ts`, audit dual-track persistence |

> **Note**: When a new amendment supersedes a previous amendment, the new amendment's `Supersedes:` field must reference the previous amendment ID, and this index should show the supersession chain.

---

## 6. Amendment file format

Each amendment file lives at `docs/amendments/<YYYY-MM-DD>-<short-slug>-amendment.md` and contains the following sections (in order):

```markdown
# AM-XXX: <Short title>

## Status
Accepted | Active | Superseded by AM-YYY

## Date
YYYY-MM-DD

## Supersedes
<path or earlier amendment ID> — what this amendment replaces

## Applies to
<list of files / docs / code paths that the amendment governs>

## Context
Why the divergence exists. Brief — link to the originating PR or DEC entry for the full story.

## Decision
The new canonical state. State it as the authoritative present-tense fact.

## Impact
Who / what is affected. Frozen docs that now reference the old state. Plan files. Code paths. Tests.

## Migration note
What future contributors should and should NOT do because of this amendment.
For path moves: explicitly state "do NOT bulk rewrite frozen docs solely for this".

## References
- Originating PR / DEC entry / plan file.
- Code locations that honour the amendment, if applicable.
- Future amendments that may supersede this one.
```

---

## 7. Procedure for adding an amendment

1. Decide the amendment ID. Sequential — the next available `AM-XXX` after the latest entry in §5.
2. Create `docs/amendments/<YYYY-MM-DD>-<short-slug>-amendment.md` using the format in §6.
3. **Append** a row to §5 of this README. Newest-first ordering.
4. If the amendment implements a policy choice (e.g. DEC-003 implies AM-002), make sure the corresponding DEC entry is captured in `docs/20-decision-log.md` first.
5. Frozen `docs/00-08` are NOT modified to add a "see amendment AM-XXX" pointer. This index is the single source of truth.
6. Open the PR. Mention the amendment in the PR title and body.

---

## 8. Future re-baseline

Amendments accumulate over time. Phase 2 produced AM-001 and AM-002. GA Prep is expected to produce more (path-traversal mitigation amendment, profile-override amendment, npm-publish package-name amendment, etc.).

A future post-GA PR may consolidate active amendments back into a new edition of `docs/00-08`. That re-baseline is **deliberately deferred** — until it happens, `docs/amendments/` is canonical for any divergence and the frozen `docs/00-08` are read as historical artifacts.
