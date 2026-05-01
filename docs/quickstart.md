# OCN Quickstart

> Companion to [`README.md`](../README.md). Read the README first for *what* OCN is and *why* it exists; this file is the *how*.

---

## 1. Install

### 1a. Recommended — install the alpha package from npm

```bash
npm install -g o-coding-navigation@alpha
```

Then verify both binaries are on your PATH:

```bash
ocn --version       # 0.1.0-alpha.0
ocn --help
ocn-mcp             # starts the MCP stdio server; press Ctrl+C to exit
```

The MCP server binary `ocn-mcp` is published. **MCP Host validation completed for Claude Desktop on Windows with WSL2** (see [DEC-017](./20-decision-log.md) and [`reports/2026-04-30-mcp-external-host-validation-report.md`](./reports/2026-04-30-mcp-external-host-validation-report.md)). **Cursor and Cline remain unverified** — treat them as *implemented* but not as *verified host-compatibility* until separate validation lands. The historical [DEC-005](./20-decision-log.md#dec-005defer-external-mcp-host-validation-until-a-real-host-is-available) caveat is preserved as a record of the deferral that originally applied.

> MCP Host validation completed for Claude Desktop on Windows with WSL2. Cursor and Cline remain unverified.

To uninstall: `npm uninstall -g o-coding-navigation`.

**Prerequisites**: Node.js ≥ 20.

> **dist-tag note**: at the moment, `npm view o-coding-navigation dist-tags` shows both `alpha` and `latest` pointing to `0.1.0-alpha.0` because this is the first published version of the package. Always install with the explicit `@alpha` selector — that decouples your install from any future `latest` movement when a stable `0.1.0` (no `-alpha`) or `1.0.0` lands. See [`docs/reports/2026-04-29-npm-alpha-publish-report.md`](./reports/2026-04-29-npm-alpha-publish-report.md) §9.

### 1b. Alternative — local development from source

If you are developing OCN itself, use the source checkout path instead. This is the contributor path, not the user path.

```bash
git clone https://github.com/UncleTIM-GZ/O-CodingNavigation.git
cd O-CodingNavigation
npm install
npm run build
npm link
```

Verify:

```bash
ocn --version
ocn-mcp
```

To uninstall the global links: `cd O-CodingNavigation && npm unlink -g ocn ocn-mcp`.

---

## 2. First 5 minutes (DISCOVERY → SPEC walkthrough)

### Step 1 — Init

```bash
mkdir ocn-demo && cd ocn-demo
ocn init
ocn status
```

Expected: `currentStateId: state_discovery`, `currentStepId: step_project_brief`. The first step in the SOP map is `step_project_brief`, whose artifact slot is `docs/00-project-brief.md`.

### Step 2 — Create the first artifact

```bash
ocn doc create project-brief
```

Writes `docs/00-project-brief.md` from the bundled bilingual template. Open it and fill in the 4 required sections:

```
# Problem｜问题
…describe the problem…

# Goal｜目标
…describe the goal…

# Users｜用户
…describe the target users…

# Success Criteria｜成功标准
…describe what success looks like…
```

Section names are matched case-insensitively after NFKC normalisation, so `Problem` ≡ `problem` ≡ `Problem｜问题` ≡ `Problem | 问题`.

### Step 3 — Gate, then advance

```bash
ocn gate              # read-only — confirms the artifact passes
ocn advance           # gate + state mutation + audit trail
ocn status            # state_discovery / step_scope
```

If the gate is blocked, `gate` and `advance` both report a bilingual list of missing sections and exit non-zero. `advance` never mutates state on a blocked gate.

### Step 4 — Repeat through SPEC

```bash
ocn doc create scope        # docs/01-scope.md
# fill: In Scope, Out of Scope, Technical Constraints, Completion Boundary
ocn advance                 # → state_spec / step_prd

ocn doc create prd          # docs/02-prd.md
# fill: Problem, Goals, Users, Scenarios, Requirements
ocn advance                 # → state_spec / step_acceptance_criteria
```

### Step 5 — Read the audit trail

```bash
cat .ocoding/audit/audit-events.jsonl | head
cat docs/22-audit-trail.md | head -50
```

Every command above contributed events. The full advance chain shares a `correlationId`, so you can grep for one ULID and reconstruct the entire transition.

### Step 6 — Brief an AI agent

```bash
ocn brief
```

Prints the current-step required sections, the AI Governance reminders, and the Uncertainty Policy. Pipe it into your AI coding host so the agent resumes with full context.

---

## 3. Expected file tree after init

```
ocn-demo/
├── .ocoding/
│   ├── state.json                       ← machine source of truth (locked, atomic writes)
│   ├── state.json.bak                   ← rolling backup
│   ├── sop.yaml                         ← snapshot of the bundled SOP profile
│   ├── gates.yaml
│   ├── config.yaml
│   ├── .lock                            ← present only while a write is in flight
│   └── audit/
│       └── audit-events.jsonl           ← machine audit log (append-only JSONL)
└── docs/
    └── 22-audit-trail.md                ← human audit narrative (created on first event)
```

After `doc create project-brief` you'll also see `docs/00-project-brief.md`. After advancing through SCOPE you'll see `docs/01-scope.md`. After SPEC you'll see `docs/02-prd.md`. And so on per [`docs/00-project-brief.md` Appendix A](./00-project-brief.md).

---

## 4. Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_IO_OR_CONFIG: project not initialized` | Running a command before `ocn init`. | `ocn init` first. |
| `ERR_GATE_FAILED` from `ocn check` / `ocn gate` / `ocn advance` | Current artifact is missing a required section. | Read the bilingual `missingRequiredSectionIds` list and add those headings. |
| `ERR_STATE_MACHINE` from `ocn advance` | Already at the last wired step (DISCOVERY → PLAN have steps; BUILD onward have state IDs only). | This is expected once you reach the end of the wired step map. Future PRs will wire BUILD/VERIFY/SHIP/REFLECT steps. |
| `ERR_ARTIFACT_INVALID` from `ocn doc create <type>` | `<type>` is not one of the 5 supported. | Pick from `project-brief`, `scope`, `prd`, `acceptance-criteria`, `technical-architecture`. |
| `ERR_IO_OR_CONFIG: lock acquire timeout` | A previous `ocn advance` was killed mid-write and the lock is stale. | Wait 30s for the stale-recovery path to fire automatically, or inspect `.ocoding/.lock` — if its PID is not running, it is safe to delete. |
| `ocn-mcp` writes nothing on stderr but the host shows nothing happening | MCP stdio is silent on the success path by design (audit fallback uses a silent logger). | Use the host's tool-list view to confirm 7 tools loaded. |

If you suspect a real bug, run with `--json` to capture the full `CommandResult` envelope and file an issue with that JSON.

---

## 5. Wiring `ocn-mcp` into a host

Claude Desktop config example:

```json
{
  "mcpServers": {
    "ocn": {
      "command": "ocn-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

The 7 allowed tools listed in [`docs/mcp-usage.md`](./mcp-usage.md) §2 will appear on `tools/list`. The 4 forbidden tools (`navigator.advance_phase`, `navigator.capture_decision`, `navigator.reset_project`, `navigator.force_release_lock`) will not — that's enforced by `tests/unit/mcp-tool-registry.test.ts`.

Every tool requires an absolute `projectRoot` argument. The host (or your prompt) supplies this; OCN itself is project-agnostic.

---

## 6. Where to go next

- [README §6](../README.md#6-core-cli-commands) — full CLI reference table.
- [README §7](../README.md#7-mcp-tools) — MCP allowed/forbidden surface summary.
- [`docs/mcp-usage.md`](./mcp-usage.md) — MCP host wiring + safety boundaries.
- [`docs/00-project-brief.md`](./00-project-brief.md) Appendix A — the full SOP step map.
- [`docs/20-decision-log.md`](./20-decision-log.md) — DEC-001 through the present.
- [`docs/amendments/README.md`](./amendments/README.md) — active divergences from the frozen design baseline.
