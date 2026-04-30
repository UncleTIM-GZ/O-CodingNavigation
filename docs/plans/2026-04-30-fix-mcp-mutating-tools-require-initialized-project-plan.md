# Plan｜fix/mcp-mutating-tools-require-initialized-project

> Status: planning input only — no src or test changes in this PR.
> Source: docs/reports/2026-04-30-post-alpha-codex-audit.md §3 (P1-001).
> Caveat: External MCP Host Validation pending. This plan must not start PR D, must not remove the caveat, and must not start beta promotion.

---

## 1. Problem

Codex found that `navigator.create_artifact` validates `projectRoot` only as an absolute existing directory. It does not require the directory to be an initialized OCN project.

Evidence:

- `src/core/security/project-root.ts:48`
- `src/mcp/tools/create-artifact.ts:21`

A real MCP host could write OCN artifacts into arbitrary absolute directories such as `/`, `$HOME`, or unrelated repositories, as long as `projectRoot` passes the current directory validation. This breaks the MCP threat model assumption (`docs/security/mcp-threat-model.md`) that mutating tools only act inside an initialized OCN project.

## 2. Goal

Mutating MCP tools must only write inside initialized OCN projects.

Concretely:

- Every mutating MCP tool must reject `projectRoot` values that are not initialized OCN projects, with a structured bilingual error envelope.
- Read-only MCP tools must have an explicit, documented behaviour for non-initialized roots.
- The MCP threat model and `docs/mcp-usage.md` must accurately reflect the new contract.

## 3. Non-goals

- Do not change CLI behaviour unless required to keep contracts aligned.
- Do not add new MCP tools.
- Do not remove existing MCP tools.
- Do not implement PR D (real MCP Host Validation).
- Do not remove the External MCP Host Validation pending caveat.
- Do not promote latest, change dist-tags, or publish to npm.
- Do not bump the package version inside this PR (a future PR / DEC decides whether to ship `alpha.2`).
- Do not refactor unrelated MCP code.

## 4. Affected tools

The OCN MCP whitelist (CLAUDE.md §4.8) exposes these seven tools. Each one is classified below as **mutating** or **read-only**.

| Tool | Class | Initialized-project required? | Notes |
| --- | --- | --- | --- |
| `navigator.create_artifact` | mutating | **yes** | writes `docs/<artifact>.md`, audit events |
| `navigator.capture_log` | mutating | **yes** | writes `.ocoding/log/*.jsonl` and audit events |
| `navigator.run_gate` | read-only | **yes** | semantically pointless without an initialized project; should fail fast with a structured error |
| `navigator.brief` | read-only | **yes** | brief content is meaningless without state.json + SOP snapshot; structured error |
| `navigator.where_am_i` | read-only | **yes** | mirrors `ocn status`; structured error if no project |
| `navigator.detect_sop_version` | read-only | **yes** | requires persisted SOP snapshot; structured error if not initialized |
| `navigator.generate_next_prompt` | read-only | **yes** | depends on state.json + SOP; structured error if not initialized |

In v1.0 every MCP tool requires an initialized project. There are no diagnostic tools that should run against an unrelated directory.

The mutating-vs-read-only classification matters because the **error response is structured for both, but mutating tools must additionally guarantee no partial side-effect** (no file written, no audit event written, no lock acquired) when the initialized-project check fails.

## 5. Proposed design

Centralize the initialized-project check in one helper rather than scattering checks across each MCP tool.

Either:

- extend `src/core/security/project-root.ts` with a new exported function, or
- add a sibling module `src/core/security/ocn-project-root.ts`

with the signature:

```ts
validateInitializedProjectRoot(input: unknown): Promise<ValidatedProjectRoot>
```

Behaviour:

1. Call `validateProjectRoot(input)` first to enforce the existing absolute-path / existing-directory / realpath rules. Reuse, do not re-implement.
2. Resolve `realpath` (already done by `validateProjectRoot`).
3. Require `<projectRoot>/.ocoding/state.json` to exist as a regular file.
4. Read and parse `state.json`; validate it against the canonical Zod schema for project state (single shared schema — do not duplicate inline validation).
5. Optionally check that `<projectRoot>/.ocoding/sop.yaml` (or whatever profile marker the SOP loader expects) exists and parses, to fail fast for partially-initialized projects.
6. Return a `ValidatedProjectRoot` value (or a richer `InitializedProjectRoot` type that also carries the parsed state and SOP snapshot for downstream tools, if it cleanly removes a duplicate read).
7. On any failure, return a structured bilingual error — never throw across the MCP boundary. The validation function itself must never write to disk and must never acquire any lock.

Each MCP tool handler then:

- calls `validateInitializedProjectRoot(args.projectRoot)` first
- on failure, immediately returns the structured envelope (no audit event, no file write, no state mutation)
- on success, proceeds with current logic

## 6. MCP behaviour contract

For invalid or uninitialized `projectRoot`, every MCP tool returns:

```jsonc
{
  "ok": false,
  "code": "ERR_IO_OR_CONFIG",          // or new ERR_PROJECT_NOT_INITIALIZED
  "message": {
    "en": "projectRoot is not an initialized OCN project",
    "zh": "projectRoot 不是已初始化的 OCN 项目"
  },
  "data": {
    "projectRoot": "<input>",
    "reason": "missing-state-json" | "invalid-state-schema" | "missing-sop-snapshot"
  }
}
```

The implementation PR must decide:

- **Option A (recommended):** reuse the existing `ERR_IO_OR_CONFIG` code (exit code 4 in `CLAUDE.md` §4.6) so we do not enlarge the error contract surface. Differentiate via `data.reason`.
- **Option B:** introduce a new stable code `ERR_PROJECT_NOT_INITIALIZED`. If chosen, this is a contract change that must be documented in `docs/06-api-contract.md`, `docs/mcp-usage.md`, and a fresh DEC entry, and the result/error envelope tests must be updated in lockstep.

Either option must be decided in the implementation PR, not later. Do not ship both.

The error message MUST be bilingual (`{ en, zh }`) per CLAUDE.md §4.4.

## 7. Tests required

The implementation PR must add the following tests. The plan documents them here so reviewers know what acceptance looks like.

Unit tests for `validateInitializedProjectRoot`:

- rejects `/`
- rejects `$HOME`
- rejects an absolute existing non-OCN directory (e.g. a `tmp` dir created in the test)
- rejects an unrelated git repo (no `.ocoding/state.json`)
- rejects a partially-initialized project (e.g. `.ocoding/` exists but `state.json` is missing or malformed)
- accepts a freshly `ocn init`-ed project under a tmp dir

MCP integration tests:

- `navigator.create_artifact` against an uninitialized tmp directory:
  - returns structured envelope with the agreed error code
  - **no file written** under that directory
  - **no audit event written** anywhere
  - **no lock acquired** or held
- `navigator.capture_log` against an uninitialized tmp directory: same negative guarantees
- `navigator.run_gate` against an uninitialized tmp directory: structured envelope, no side-effects
- `navigator.brief`, `navigator.where_am_i`, `navigator.detect_sop_version`, `navigator.generate_next_prompt`: each returns the structured envelope when not initialized
- no raw exception crosses the MCP boundary in any of the above
- happy-path tests still pass for an initialized project

Boundary tests:

- symlinked `projectRoot` whose realpath points outside the initialized project is still rejected
- `projectRoot` that becomes uninitialized between calls (TOCTOU) results in a structured failure on the next call rather than a partial write

Coverage targets for the implementation PR:

- raise `src/core/security/project-root.ts` coverage above 90%
- ensure new helper has 100% line + branch coverage
- maintain or improve overall coverage above current 83.45%

## 8. Acceptance criteria

The implementation PR is mergeable when all of:

- `create_artifact` cannot write into arbitrary absolute directories.
- `capture_log` cannot write into arbitrary absolute directories.
- All seven MCP tools return structured envelopes (`ok: false` + bilingual message) for uninitialized roots, with no raw exceptions crossing the boundary.
- No forbidden tool (the four MCP tools forbidden in v1.0 by CLAUDE.md §4.8) becomes exposed.
- All new and existing tests pass; lint, typecheck, build all green.
- `docs/mcp-usage.md` and `docs/security/mcp-threat-model.md` are updated to describe the new contract truthfully.
- The "External MCP Host Validation pending" caveat is preserved.
- The package version is **not** bumped in the same PR; a separate DEC + PR decides whether to ship as `alpha.2`.

## 9. Risks

- **Too strict validation could break legitimate existing projects.** Mitigation: `validateInitializedProjectRoot` runs against `state.json` produced by `ocn init`, which we control. Add a regression test that walks the full happy path from `ocn init` to MCP tool call.
- **Read-only tools' new fail-fast behaviour is a UX change.** Mitigation: explicit error code + clear bilingual message; document in `docs/mcp-usage.md`.
- **Error code drift.** Mitigation: pick Option A or B in §6 and update docs + tests in the same implementation PR; do not ship a hybrid.
- **TOCTOU between validation and write.** Mitigation: keep state-write atomic semantics inside `core/state-store`; the validation only narrows the allowed set, it does not weaken existing locking.
- **MCP host integration regressions.** Mitigation: do not start PR D until at least P1-001 and P1-004 are merged; PR D will then validate against the corrected boundary.

## 10. Out of scope

- Real MCP Host validation (PR D)
- Beta promotion
- npm publish
- npm dist-tag changes / latest promotion
- Decision on whether to ship as `0.1.0-alpha.2` (deferred to a future DEC)
- Other P1 fixes (P1-002, P1-003, P1-004) — each gets its own PR per the recommended order in the audit report
- P2 / P3 follow-ups (lock semantics for doc/log writes, MCP audit attribution, error code normalization, docs sweep, Node 22 matrix)
