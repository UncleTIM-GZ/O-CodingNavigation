# 2026-05-04 — Beta.1 Tester-Facing Docs Parity Fix

## 1. Summary

`README.md` and `docs/quickstart.md` updated to reflect the v0.2.0-beta.1 actual capabilities. The two-stage product model (Planning Gatekeeper + Execution Evidence Navigator) is now documented; the six Execution Navigator commands shipped in PRs #63–#68 are now in the CLI reference and quickstart; the minimal usage path is extended with a post-plan execution flow; the §10 roadmap has an Execution Navigator MVP completion addendum; and `production-ready` wording (negated and otherwise) is removed.

No npm publish, dist-tag movement, version change, package metadata change, source/test/workflow change, decision-log change, or new git tag/release. Strict docs-only PR.

## 2. Source basis

- Published artifact: `o-coding-navigation@0.2.0-beta.1` on npm (`latest`, `beta`); `alpha = 0.1.0-alpha.2` preserved.
- Annotated git tag `v0.2.0-beta.1`; matching GitHub prerelease at `releases/tag/v0.2.0-beta.1`.
- Authoritative reframe: `docs/20-decision-log.md` DEC-024 (Execution Evidence Navigator).
- Series closure: [`docs/reports/2026-05-04-execution-navigator-verdict-draft.md`](./2026-05-04-execution-navigator-verdict-draft.md).
- Per-MVP implementation reports under `docs/reports/2026-05-02-execution-navigator-*.md`.
- Cross-cutting review fixes: [`docs/reports/2026-05-04-execution-navigator-review-fixes-pr-a.md`](./2026-05-04-execution-navigator-review-fixes-pr-a.md).
- Host validation boundary: DEC-017 (Claude Desktop on Windows + WSL2 validated) / DEC-019 (Cursor and Cline unverified).

## 3. Gaps fixed

- Two-stage positioning (Planning Gatekeeper + Execution Evidence Navigator) was missing from tester-facing docs entirely.
- The six Execution Navigator commands (`exec status`, `github analyze-pr`, `evidence map`, `next-prompt`, `verify status`, `verdict draft`) were undocumented in README §6 and absent from the quickstart.
- Minimal usage path stopped at `ocn advance`; nothing pointed testers at the post-plan implementation surface.
- §10 Roadmap did not record the Execution Navigator MVP series completion (PRs #63–#68 + #69) or surface DEC-024 to readers.
- `production-ready` wording (always negated as `not production-ready` / `非生产可用`) violated the disclaimer style required by the parity task — replaced with `not GA` / `beta only` / `for controlled testing / dogfood` / `仅 beta（用于受控测试 / dogfood）`.

## 4. Files changed

### `README.md`

English Part 1:
- §0 (TOC) — added §3.1, §5.6, §6.1, §6.2 anchors and updated §3 anchor (status header changed in an earlier release sync; TOC now matches).
- §3 Current status — replaced `not production-ready` with `beta only (for controlled testing / dogfood)`.
- §3.1 Two-stage product model — new subsection introducing Planning Gatekeeper + Execution Evidence Navigator with link to DEC-024 and the series closure report.
- §4.2 Pre-GA caveat — replaced `not production-ready` wording.
- §5.6 Post-plan execution flow — new subsection wiring the 4-step extension to the planning-gate path; lists the six Execution Navigator commands.
- §6 Core CLI commands — split into §6.1 Planning Gatekeeper commands (existing 7) and §6.2 Execution Navigator commands (new table + prose for the 6 read-only commands).
- §10 Roadmap — appended `Execution Navigator MVP series (post-DEC-024)` subsection covering MVP 1–6 closure, current package state, and Cursor/Cline boundary.

Chinese Part 2 (mirror):
- 中文 TOC — added §C.1, §E.6, §F.1, §F.2 anchors and updated §C anchor.
- §C — replaced `非生产可用` with `仅 beta（用于受控测试 / dogfood）`.
- §C.1 两阶段产品模型 — new subsection mirroring §3.1.
- §D.2 pre-GA 警告 — replaced `非生产可用` wording.
- §E.6 实现阶段：执行证据流 — new subsection mirroring §5.6.
- §F — split into §F.1 Planning Gatekeeper 命令 and §F.2 Execution Navigator 命令.
- §J Roadmap — appended `Execution Navigator MVP 系列（DEC-024 之后）` subsection.

### `docs/quickstart.md`

- English TOC — added §2.7 anchor.
- English §2.7 Post-plan execution flow — new subsection with the 4-step extension and the six-command list, linking to README §6.2.
- 中文 TOC — added §B.7 anchor.
- 中文 §B.7 实现阶段：执行证据流 — Chinese mirror.

### `docs/mcp-usage.md`

- Unchanged. Verified during this PR: install commands match the README; pre-GA host boundary wording matches the README; the 7 advertised MCP tools still match the actual exposed surface; no `production-ready` / `GA-ready` / `Cursor verified` / `Cline verified` strings present. No factual conflict found, so no edit applied.

### `docs/reports/2026-05-04-beta-1-docs-parity-fix.md`

- New file (this report).

### Forbidden-file check

`git status --short` and `git diff -- src tests package.json package-lock.json .github docs/20-decision-log.md` confirmed no source, test, package, workflow, or decision-log changes.

## 5. Validation

Local docs-only validation (no production code touched in this PR):

- `npm run lint` — pass.
- `npm run typecheck` — pass.
- `npm run test` — pass (full vitest suite).

Forbidden-string grep across the three tester-facing docs returned zero hits:

```
grep -in 'production-ready\|GA-ready\|Cursor verified\|Cline verified' \
     README.md docs/quickstart.md docs/mcp-usage.md
```

## 6. Non-goals

- No `npm publish`, `dist-tag`, `version`, or `latest`/`beta`/`alpha` movement.
- No `package.json` or `package-lock.json` change.
- No git tag creation; no GitHub release.
- No `src/`, `tests/`, `.github/workflows/` change.
- No `docs/20-decision-log.md` change.
- No new MCP tools; no `docs/mcp-usage.md` change (mcp-usage was scanned and left intact).
- No GA promotion start; no Cursor/Cline validation claim — DEC-019 boundary stands.
- No claim that the package is `production-ready`, `GA-ready`, `Cursor verified`, or `Cline verified`.

## 7. Next recommended step

Merge this docs-only PR, then invite testers to install `o-coding-navigation@0.2.0-beta.1` and run one real external-repo dogfood pass through the post-plan execution flow (`exec status` → `github analyze-pr` → `evidence map` → `next-prompt` → `verify status` → `verdict draft`). Capture gaps in a dedicated dogfood report before any further release sync or GA promotion.
