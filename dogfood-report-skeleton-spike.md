# Skeleton Spike Dogfood Report

> Date: 2026-04-28
> Branch: `feat/skeleton-spike-phase0-phase1`
> Plan: [`docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`](./docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md)
> Verdict: **PASS — all three gates green (G0, G1, G2).**

---

## 1. Acceptance Verdict

| Gate | Definition | Result |
|---|---|---|
| **G0** — Phase 0 ready | lint + typecheck + test:coverage all green; CLI `--help` works; helpers + fixtures exist | ✅ PASS |
| **G1** — Phase 1 ready | All Phase 1 unit + CLI + e2e tests green | ✅ PASS |
| **G2** — Acceptance | Verbatim 8-command demo produces exact JSON contract from plan §3.3 | ✅ PASS |

---

## 2. Test Results

```
Test Files  28 passed (28)
Tests       117 passed (117)
Duration    ~47s

Coverage report (v8):
  Lines       74.05% (threshold 70 ✓)
  Functions   85.41% (threshold 70 ✓)
  Branches    82.96% (threshold 60 ✓)
  Statements  74.05% (threshold 70 ✓)
```

CLI command files (`src/cli/commands/*.ts`, `src/cli/output.ts`, `src/cli/index.ts`) report 0% in-process coverage because they are exercised exclusively via subprocess `spawnOcn(...)` — v8 instrumentation does not cross process boundaries. Their behavior is fully covered by the CLI integration tests + e2e demo. See `implementation-notes.md` §4 for follow-up.

---

## 3. Demo Transcript (verbatim user spec §XVIII)

The acceptance demo was executed against a freshly built `dist/cli/index.js`:

```
DEMO DIR: /tmp/ocn-demo-DbWM
```

### Step 1 — `ocn init --tier minimal`

```
已在 /tmp/ocn-demo-DbWM 初始化 OCN（tier=minimal）。
OCN initialized at /tmp/ocn-demo-DbWM (tier=minimal).
Current State: state_spec
Current Step:  step_prd
```
exit code **0** ✓

### Step 2 — `ocn status`

```
Project: Local OCN Project (local-project)
Tier: minimal
SOP Profile: default-ai-coding-sop@0.1.0
Current State: state_spec
Current Step:  step_prd
Current Artifact: /tmp/ocn-demo-DbWM/docs/02-prd.md
Next Action: Edit docs/02-prd.md, then run `ocn check`.
```
exit code **0** ✓

### Step 3 — `ocn brief` (before PRD)

```
Current State: state_spec
Current Step:  step_prd
Current Artifact: /tmp/ocn-demo-DbWM/docs/02-prd.md
Current Artifact Status: missing
Current Blockers: section_problem, section_goals, section_users, section_scenarios, section_requirements
AI Governance Reminder:
  AI must NOT mark a blocked artifact as complete. AI must NOT advance project state.
  AI must NOT mutate .ocoding/state.json directly. AI must NOT modify SOP profile content
  without an explicit Decision Log entry.
Uncertainty Policy:
  If data is insufficient, AI must explicitly state "数据不足" or "需要人工确认" rather
  than guess. Never fabricate facts about state, artifacts, or gate results.
```
exit code **0** ✓ — includes both **AI Governance Reminder** and **Uncertainty Policy** blocks.

### Step 4 — `ocn doc create prd`

```
已创建 PRD 模板：/tmp/ocn-demo-DbWM/docs/02-prd.md。
Created PRD template at /tmp/ocn-demo-DbWM/docs/02-prd.md.
```
exit code **0** ✓

### Step 5 — `cp prd-missing-scenarios.md docs/02-prd.md`

(filesystem op, no CLI output)

### Step 6 — `ocn check --json` (must be BLOCKED)

```json
{
  "ok": false,
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "PRD is missing required section: Scenarios.",
    "zh": "PRD 缺少必填章节：Scenarios｜使用场景。"
  },
  "error": {
    "code": "ERR_ARTIFACT_INVALID",
    "message": {
      "en": "PRD is missing required section: Scenarios.",
      "zh": "PRD 缺少必填章节：Scenarios｜使用场景。"
    }
  },
  "data": {
    "artifactPath": "/tmp/ocn-demo-DbWM/docs/02-prd.md",
    "status": "blocked",
    "missingRequiredSectionIds": ["section_scenarios"]
  }
}
```
exit code **2** ✓ — exact match against user spec §X.

### Step 7 — `cp prd-with-scenarios.md docs/02-prd.md`

(filesystem op, no CLI output)

### Step 8 — `ocn check --json` (must be PASS)

```json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "PRD passed Skeleton Spike artifact check.",
    "zh": "PRD 已通过 Skeleton Spike 产物检查。"
  },
  "data": {
    "artifactPath": "/tmp/ocn-demo-DbWM/docs/02-prd.md",
    "status": "pass",
    "missingRequiredSectionIds": []
  }
}
```
exit code **0** ✓ — exact match against user spec §X.

### Step 9 — `ocn brief` (final)

```
Current Artifact Status: pass
Current Blockers: (none)
AI Governance Reminder: <full text printed>
Uncertainty Policy:     <full text printed>
```
exit code **0** ✓ — context resumption + governance reminders present.

---

## 4. Acceptance Criteria Trace

| AC ID | Description | Status | Test path |
|---|---|---|---|
| AC-DOMAIN-001 | BilingualMessage schema | ✅ | `tests/unit/schema-bilingual-message.test.ts` |
| AC-INIT-001 | `ocn init --tier minimal` creates 4 files | ✅ | `tests/cli/init.test.ts`, `tests/unit/core-init.test.ts` |
| AC-INIT-002 | Default tier = minimal | ✅ | `tests/cli/init.test.ts`, `tests/unit/core-init.test.ts` |
| AC-STATE-003 | `currentStateId` + `currentStepId` are SoT (not numeric) | ✅ | `tests/unit/schema-project-state.test.ts`, `tests/unit/id.test.ts` |
| AC-STATUS-001 | status output structure | ✅ | `tests/cli/status.test.ts`, `tests/unit/core-status.test.ts` |
| AC-BRIEF-001 | brief contains state/step/artifact/blockers | ✅ | `tests/cli/brief.test.ts`, `tests/unit/core-brief.test.ts` |
| AC-BRIEF-002 | brief contains AI Governance + Uncertainty Policy | ✅ | `tests/cli/brief.test.ts` |
| AC-DOC-001 | PRD template with bilingual headings | ✅ | `tests/cli/doc-create.test.ts`, `tests/unit/core-doc.test.ts` |
| AC-DOC-003 | Self-check block w/ 6 unchecked boxes | ✅ | `tests/cli/doc-create.test.ts` |
| AC-PROMPT-002 | Missing Scenarios is not marked complete | ✅ | `tests/cli/check.test.ts`, `tests/e2e/skeleton-spike-demo.test.ts` |
| AC-SAG-001 | Required-section missing ⇒ blocked | ✅ | `tests/unit/gate-status.test.ts`, `tests/cli/check.test.ts` |
| AC-SAG-004 | Pass / blocked tri-state | ✅ | `tests/unit/gate-status.test.ts`, `tests/cli/check.test.ts` |
| AC-SECTION-001 | Markdown AST heading extraction | ✅ | `tests/unit/markdown-parser.test.ts` |
| AC-SECTION-002 | Canonical heading match | ✅ | `tests/unit/required-section-matcher.test.ts` |
| AC-SECTION-003 | English alias match | ✅ | `tests/unit/required-section-matcher.test.ts` |
| AC-SECTION-004 | Chinese alias match | ✅ | `tests/unit/required-section-matcher.test.ts` |
| AC-SECTION-005 | Heading level out of range rejected | ✅ | `tests/unit/required-section-matcher.test.ts` |

All `must` ACs in the Skeleton Spike scope have ≥ 1 test reference. AC coverage script will be added in Phase 2 (see `implementation-notes.md` §6).

---

## 5. Files Changed (this PR)

### Toolchain (root)
- `package.json`, `package-lock.json`
- `tsconfig.json`, `tsconfig.build.json`
- `vitest.config.ts`
- `eslint.config.js`
- `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.npmrc`, `.gitattributes`
- `README.md`
- `.github/workflows/ci.yml`
- `.husky/pre-commit`

### Source
- `src/index.ts` — public type re-exports
- `src/types/{i18n,result,state,artifact,sop,index}.ts`
- `src/core/{id,time,i18n,result,paths,init,status,brief,doc,check}.ts`
- `src/core/state/state-store.ts`
- `src/core/sop/loader.ts`
- `src/core/artifact/{markdown-parser,required-section-matcher,gate-status,template-writer}.ts`
- `src/core/templates/prd.ts`
- `src/sops/default-ai-coding-sop/0.1.0/{sop,gates,artifacts,config}.ts`
- `src/cli/index.ts`
- `src/cli/output.ts`
- `src/cli/render/{text,json}.ts`
- `src/cli/commands/{init,status,brief,doc,check}.ts`

### Tests
- `tests/helpers/{temp-project,spawn-ocn,fs-failure,fixtures}.ts`
- `tests/fixtures/sop/skeleton-spike-sop.yaml`
- `tests/fixtures/artifacts/{prd-missing-scenarios,prd-with-scenarios}.md`
- `tests/fixtures/projects/{empty,valid-minimal}/...`
- `tests/fixtures/state/{valid-state,invalid-state}.json`
- `tests/unit/*.test.ts` × 18
- `tests/cli/*.test.ts` × 6
- `tests/e2e/skeleton-spike-demo.test.ts`

### Docs
- `docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md`
- `dogfood-report-skeleton-spike.md` (this file)
- `implementation-notes.md`

---

## 6. Commands Implemented

| Command | Status |
|---|---|
| `ocn init [--tier minimal\|production\|full] [--json]` | ✅ — only `minimal` tier exercised in spike |
| `ocn status [--json]` | ✅ |
| `ocn brief [--json]` | ✅ |
| `ocn doc create <type> [--overwrite] [--json]` | ✅ — only `prd` accepted |
| `ocn check [--json]` | ✅ |
| `--help` / `--version` | ✅ |

**Out of scope (Phase 2)**: `ocn advance`, `ocn baseline create`, `ocn doctor`, `ocn reset`, `ocn sop {version,diff,upgrade}`, `ocn log`, `ocn prompt next`, `ocn test record`, `ocn check --include-tests`, MCP server, audit subsystem.

---

## 7. Core Engine Functions Implemented

| Function | Path |
|---|---|
| `initProject(opts)` | `src/core/init.ts` |
| `getStatus(opts)` | `src/core/status.ts` |
| `generateBrief(opts)` | `src/core/brief.ts` |
| `createArtifact(opts)` | `src/core/doc.ts` |
| `checkCurrentArtifact(opts)` | `src/core/check.ts` |

Plus supporting primitives: `parseHeadings`, `matchSection`, `computeArtifactGateStatus`, `writeArtifact`, `loadSopProfile`, `readState`, `writeState`, `ok`, `blocked`, `exitCodeFor`, `msg`, `nowIsoUtc`, `isStateId`, `isStepId`, `isSectionId`, `normalizeHeading`.

---

## 8. Operational Notes

### Build artifacts

```
dist/
  cli/
    index.js        (executable, +x bit set)
    commands/*.js
    output.js
    render/*.js
  core/...
  sops/...
  types/...
  index.{js,d.ts}
```

Verified `dist/cli/index.js` first line: `#!/usr/bin/env node` ✓.

### Pre-commit hook

`.husky/pre-commit` runs `npm run lint && npm run typecheck && npm run test`. Husky 9 layout — no `husky.sh` sourcing needed. The `prepare` script handles install gracefully under non-git environments (`husky || true`).

### CI

`.github/workflows/ci.yml` runs on push/PR to `main`:
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm run test:coverage`
6. Uploads `coverage/` as artifact.

---

## 9. Things NOT Done in This Spike (intentional — see `docs/01-scope.md` §8 + plan §3.2)

- ❌ MCP server
- ❌ `ocn advance` (and never `navigator.advance_phase`)
- ❌ Lock + backup + atomic `state.json` writes
- ❌ Audit event subsystem
- ❌ `ocn baseline create`
- ❌ `ocn doctor`
- ❌ `ocn reset`
- ❌ SOP versioning commands
- ❌ Tier `production` / `full` artifact sets
- ❌ Test result gate (`ocn test record`, `ocn check --include-tests`)
- ❌ LLM Judge
- ❌ SQLite, Web GUI, TUI, vector retrieval, code-level enforcement

---

## 10. Steps for Next Session (Phase 2 hints)

1. Implement state-store lock + backup + atomic write (see CLAUDE.md §4.5 + `.claude/rules.md` §2). Add concurrency tests (Layer 6).
2. Implement audit subsystem (`.ocoding/audit/<yyyy-mm>.jsonl` + `docs/21-audit-trail.md`). Wire to `init`, `check`, future `advance`/`baseline`/`gate`.
3. Build full state-machine + `ocn advance` + `runGate` + `createBaseline`.
4. Add Minimal MCP Server (7 tools, **never** `advance_phase`).
5. Add `ocn doctor` + `ocn reset --keep-docs/--keep-state/--hard`.
6. Add `ocn sop version/diff/upgrade --plan`.
7. Add Tier production/full artifact set + corresponding required-section maps.
8. AC coverage script that walks `docs/03-acceptance-criteria.md`.
9. Replace hand-rolled markdown parser with `remark` once body-content checks are needed.
10. Set up `npm publish` lane after a `name` decision (the package name `ocn` may be taken).

---

**END OF REPORT**
