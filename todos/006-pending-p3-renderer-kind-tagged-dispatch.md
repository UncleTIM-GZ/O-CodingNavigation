---
status: pending
priority: p3
issue_id: 006
tags: [code-review, simplicity, renderer]
dependencies: []
---

# Replace structural type-sniffing in `renderText` with `kind`-tagged dispatch

## Problem Statement

`src/cli/render/text.ts:74-113` branches on `"aiGovernanceReminder" in data || "currentBlockers" in data`, then `"currentStateId" in data`, then `"artifactPath" in data`, etc. — string-key sniffing instead of a tagged variant. Plus `appendStatusBlock` uses `out.unshift(...)` and `out.splice(1, 0, ...)` to inject Project/Tier/SOP at the front, which is the kind of "clever code" the project style explicitly disallows.

When Phase 2 adds `advance`, `audit`, MCP responses, this if-else cascade becomes a footgun (silent fall-through to wrong branch).

## Findings

- `src/cli/render/text.ts:74-113` — heuristic dispatch.
- `src/cli/render/text.ts:13-38` — `out.unshift` / `out.splice(1, 0, …)` ordering tricks.
- Source: architecture-strategist review P1-3 + code-simplicity-reviewer #4 + #5.

## Proposed Solutions

### Option A — Tag every `*Data` interface with a discriminator

```ts
export interface StatusData { kind: "status"; ... }
export interface BriefData { kind: "brief"; ... }
export interface InitData { kind: "init"; ... }
export interface DocCreateData { kind: "doc"; ... }
export interface CheckData { kind: "check"; ... }
```

Then renderer is a `switch (data.kind) { ... }`. Build the project header first via straight `push` — no `unshift`/`splice`.

- Pros: type-safe, no shape sniffing, future-proof for Phase 2.
- Cons: adds a literal field to each interface and the data builders.

### Option B — One renderer per command, registered by command name

`outputResult(result, { json, command: "status" })` — the renderer table dispatches.

- Pros: decouples render from data shape.
- Cons: the command name is duplicated at each handler site.

**Recommended: Option A** — minimal API surface change, maximum clarity.

## Technical Details

- Affected files: `src/cli/render/text.ts`, `src/core/{status,brief,init,doc,check}.ts` (add `kind` to data return), `tests/unit/render-text.test.ts`.

## Acceptance Criteria

- [ ] No `"X" in data` checks in `text.ts`.
- [ ] No `unshift`/`splice` for ordering — output is built sequentially.
- [ ] Each command's data carries a `kind` literal.
- [ ] Tests pass.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- Architecture review finding P1-3
- code-simplicity-reviewer findings #4 + #5
- `.claude/anti-patterns.md` §15
