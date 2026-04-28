---
title: "feat(phase2): Audit + Event Foundation — JSONL + Markdown dual persistence"
type: feat
status: active
date: 2026-04-28
---

# feat(phase2): Audit + Event Foundation

> **Origin**: [DEC-001](../19-decision-log.md#dec-001skeleton-spike-passed-and-phase-2-entry-approved) — Phase 2 PR ordering authorizes this PR after PR #2 (state-safety) merged.
>
> This is **PR #3** of the approved Phase 2 PR order. **Closes only L3** ("No audit events are written anywhere") from `implementation-notes.md` §1.
>
> Pre-requisite: PR #2 (state-safety) is merged at `3e4568a`. 152 tests passing baseline.

---

## 1. Overview

Build the minimum audit subsystem that:

1. Defines the `AuditEvent` type (12 event types × 7 result types).
2. Persists every event to **two** locations:
   - `.ocoding/audit/audit-events.jsonl` — machine source of truth, one event per line.
   - `docs/22-audit-trail.md` — human-readable narrative, append-only sections.
3. Wires the audit emission into existing surfaces (`init`, `doc create prd`, `check`) and into the lock lifecycle (acquire / release / timeout / stale-recovered) **without** introducing a deadlock.

PR #3 explicitly does NOT add `ocn advance`, full state-machine, MCP, doctor, reset, baseline, SOP versioning, or any new artifact-creation command. This is foundation only — every Phase 2 PR after this can `writeAuditEvent` instead of inventing its own logging.

---

## 2. Problem Statement

After PR #2, the OCN runtime has correct state-write safety (lock + backup + atomic rename) but is **observability-blind**:

- A future `ocn advance` (PR #4) MUST write `state_transition_*` push events per CLAUDE.md §4.7. Without an audit subsystem, PR #4 is blocked.
- A user re-running OCN cannot see why a previous step blocked or which lock fired stale-recovery — the runtime gives no journal.
- DEC-001 §"Constraints on Phase 2" explicitly states: no `runGate` aggregation without audit; no MCP exposure of `navigator.run_gate` until audit can record gate runs.

PR #3 unblocks all that with the smallest viable surface.

---

## 3. Proposed Solution

### 3.1 Storage layout (two append-only files, no lock-of-its-own)

```
.ocoding/
├── state.json           ← PR #2: lock-protected
├── state.json.bak       ← PR #2: previous-version backup
├── .lock                ← PR #2: state-write lock
├── audit/
│   └── audit-events.jsonl   ← NEW: append-only, one JSON-encoded AuditEvent per line, terminated by '\n'
docs/
└── 22-audit-trail.md    ← NEW: append-only, h1 + per-event h2 sections, auto-created on first write
```

**Why no audit lock?** POSIX `write(2)` to a file opened with `O_APPEND` is atomic for a single buffer ≤ `PIPE_BUF` (4096 bytes). Each `AuditEvent` JSON line is ~300-700 bytes. `fs.appendFile` in Node.js with the default flag `'a'` opens with `O_APPEND` and writes the full buffer in one syscall — no torn writes for events under 4 KB. We rely on this kernel guarantee instead of layering our own lock.

**Result: the audit writer cannot deadlock against the state-write lock because it never asks for any lock.**

### 3.2 Event lifecycle (per command)

```
ocn init
  ┌──────────────────────────────────────────────┐
  │ outer: withLock(.ocoding/.lock)              │
  │   if state.json exists → blocked (no event)  │
  │   write yamls + state.json                   │
  │ release lock                                  │
  └──────────────────────────────────────────────┘
  AFTER lock released:
    audit(project_initialized, success)
    audit(state_write_succeeded, success)
    audit(lock_acquired, success) + audit(lock_released, success)
        [or audit(lock_timeout, failed) on timeout — error path]
```

Audit emission happens **outside** the lock for two reasons:
1. Avoid even the perception of recursive lock acquisition.
2. If `init` failed inside the lock, we still want a `lock_released` event recording that the lock was held briefly.

### 3.3 eventId scheme

Use **ULID** via the `ulid` package already in dependencies (since PR #1 — `package.json:dependencies.ulid`).

Format: `01HXAB7QGY3M5N9P2VWQR4S6T8` (26 chars, lexicographically sortable by time).

Decision rationale:
- ULID is already a runtime dep — zero new dependency.
- Lexicographic sort matches chronological order — useful for downstream tooling without reading timestamps.
- 26 chars vs 36 chars for crypto.randomUUID — slightly more compact in JSONL.

Alternative considered: `crypto.randomUUID()` (zero deps). Rejected: ULID is already imported via package.json and gives sortability for free.

### 3.4 Failure semantics

Per user §IV + §VI:

| Step | On success | On failure |
|---|---|---|
| 1. ensure `.ocoding/audit/` exists | continue | throw — caller catches and logs warning |
| 2. JSONL append | continue | throw — DO NOT write markdown |
| 3. ensure `docs/` exists | continue | swallow + warn — JSONL is already committed |
| 4. Markdown append | done | swallow + warn — JSONL is already source of truth |

At command level (init, doc, check), every audit emission is wrapped in a `try/catch` that logs a warning to stderr but does NOT fail the command. **Audit is best-effort for existing commands in PR #3.** PR #4+ may upgrade selected events to "audit-must-succeed" for safety-critical operations like `advance`.

### 3.5 Markdown format (per user §VII)

```markdown
# Audit Trail｜审计链

> Append-only. Each H2 is one AuditEvent. The HTML comment carries machine-readable
> metadata; the body carries the human-readable bilingual message.

## 2026-04-28T03:14:15.000Z｜project_initialized

<!-- ocn-event
eventId: 01HXAB7QGY3M5N9P2VWQR4S6T8
eventType: project_initialized
result: success
source: cli
actor: user
currentStateId: state_spec
currentStepId: step_prd
-->

OCN project initialized.
已在 OCN 中初始化项目。

Related paths:
- .ocoding/state.json
- .ocoding/sop.yaml
- .ocoding/gates.yaml
- .ocoding/config.yaml
```

Each event's H2 is `<ISO_TIMESTAMP>｜<eventType>` so the file is naturally ordered and grep-friendly.

### 3.6 Lock-event wiring without deadlock

The user spec §VI is firm: lock module returns metadata, callers emit audit. PR #2 already exposes `LockHandle.reclaimed`. PR #3 adds an optional **lifecycle hook** parameter to `withLock` so callers can observe acquire/release/timeout/stale-recovered transitions without coupling lock to audit:

```ts
export interface LockLifecycleHook {
  onAcquired?: (handle: LockHandle) => void | Promise<void>;
  onReleased?: (handle: LockHandle) => void | Promise<void>;
  onTimeout?: (err: LockTimeoutError) => void | Promise<void>;
  onStaleRecovered?: (handle: LockHandle) => void | Promise<void>;
}
```

`withLock` calls each hook at the appropriate moment. Hooks are pure callbacks — they run after the lock state transitions but BEFORE the lock module continues. They MUST NOT acquire the same lock (caller's responsibility). The audit hook implementation in `src/core/audit/lock-audit.ts` does fs.appendFile and returns; it does not lock.

**Crucially**: hook errors are caught and ignored by `withLock` so a flaky audit emission cannot break the lock semantics. The hook's job is best-effort emission; the lock module remains pure.

---

## 4. Technical Approach

### 4.1 New files

```text
src/types/audit.ts                      # AuditEvent zod schema + AuditEventType + AuditResult
src/core/audit/audit-event.ts           # createAuditEvent(...) factory (ULID + timestamp)
src/core/audit/audit-paths.ts           # paths: jsonlFile(), markdownFile(), auditDir()
src/core/audit/audit-jsonl.ts           # appendAuditJsonl(root, event)
src/core/audit/audit-markdown.ts        # appendAuditMarkdown(root, event) + first-time header
src/core/audit/audit-writer.ts          # writeAuditEvent(root, event): orchestrates jsonl-then-markdown
src/core/audit/lock-audit.ts            # makeLockAuditHook(root, command) → LockLifecycleHook
src/core/audit/index.ts                 # barrel re-export

tests/unit/audit-event-schema.test.ts        # 8-12 zod parse cases
tests/unit/audit-event-factory.test.ts       # createAuditEvent ULID + timestamp invariants
tests/unit/audit-writer-jsonl.test.ts        # JSONL append + parse + multi-line
tests/unit/audit-writer-markdown.test.ts     # Markdown header + per-event sections + bilingual
tests/unit/audit-writer-failure.test.ts      # JSONL fail → no MD; MD fail → JSONL stays
tests/unit/lock-audit-hook.test.ts           # hook fires correctly; errors don't break withLock

tests/cli/audit-init.test.ts            # ocn init → project_initialized + state_write_succeeded + lock_*
tests/cli/audit-doc-create.test.ts      # ocn doc create prd → artifact_created
tests/cli/audit-check.test.ts           # ocn check → gate_run + gate_blocked / gate_passed
```

### 4.2 Modified files

```text
src/types/index.ts                      # re-export audit types
src/core/state/lock.ts                  # add `lifecycle?: LockLifecycleHook` param to AcquireLockOptions + withLock
src/core/init.ts                        # emit audit events post-lock-release
src/core/doc.ts                         # emit artifact_created on success
src/core/check.ts                       # emit gate_run + gate_blocked|gate_passed
src/core/state/state-store.ts           # emit state_write_succeeded|state_write_failed (post-lock)

implementation-notes.md                 # mark L3 RESOLVED + §9 PR #3 addendum
```

### 4.3 `AuditEvent` shape (zod, src/types/audit.ts)

```ts
import { z } from "zod";
import { BilingualMessage } from "./i18n.js";

export const AuditEventType = z.enum([
  "project_initialized",
  "state_write_started",
  "state_write_succeeded",
  "state_write_failed",
  "lock_acquired",
  "lock_released",
  "lock_timeout",
  "lock_stale_recovered",
  "artifact_created",
  "artifact_gate_run",
  "artifact_gate_blocked",
  "artifact_gate_passed",
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

export const AuditResult = z.enum([
  "success", "failed", "blocked", "pass", "warning", "detected", "executed",
]);
export type AuditResult = z.infer<typeof AuditResult>;

export const AuditActor = z.enum(["user", "system", "ai_agent"]);
export const AuditSource = z.enum(["cli", "core", "test"]);

export const AuditEvent = z.object({
  eventId: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "ULID required"),
  eventType: AuditEventType,
  result: AuditResult,
  timestamp: z.string().regex(/Z$/, "ISO 8601 UTC ending Z"),
  actor: AuditActor,
  source: AuditSource,
  projectRoot: z.string().min(1),
  currentStateId: z.string().regex(/^state_/).optional(),
  currentStepId: z.string().regex(/^step_/).optional(),
  relatedArtifactIds: z.array(z.string()).optional(),
  relatedPaths: z.array(z.string()).optional(),
  command: z.string().optional(),
  message: BilingualMessage,
  data: z.unknown().optional(),
}).strict();
export type AuditEvent = z.infer<typeof AuditEvent>;
```

### 4.4 `createAuditEvent` factory (src/core/audit/audit-event.ts)

```ts
import { ulid } from "ulid";
import type { AuditEvent } from "../../types/audit.js";

export interface CreateAuditEventInput {
  eventType: AuditEvent["eventType"];
  result: AuditEvent["result"];
  actor: AuditEvent["actor"];
  source: AuditEvent["source"];
  projectRoot: string;
  message: AuditEvent["message"];
  // optional context
  currentStateId?: string;
  currentStepId?: string;
  relatedArtifactIds?: readonly string[];
  relatedPaths?: readonly string[];
  command?: string;
  data?: unknown;
  // dependency injection for testing
  now?: () => Date;
  generateId?: () => string;
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  const now = (input.now ?? (() => new Date()))();
  const id = (input.generateId ?? ulid)();
  // build object, omit undefined optional fields per exactOptionalPropertyTypes
  ...
}
```

### 4.5 `appendAuditJsonl` (src/core/audit/audit-jsonl.ts)

```ts
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { AuditEvent } from "../../types/audit.js";
import { Paths } from "./audit-paths.js";

export async function appendAuditJsonl(root: string, event: AuditEvent): Promise<void> {
  const target = Paths.jsonlFile(root);
  await fs.mkdir(dirname(target), { recursive: true });
  // Single buffer < 4 KB → POSIX append is atomic. No lock needed.
  await fs.appendFile(target, JSON.stringify(event) + "\n", "utf8");
}
```

### 4.6 `appendAuditMarkdown` (src/core/audit/audit-markdown.ts)

- First write: write header "# Audit Trail｜审计链\n\n> Append-only. ...\n\n" then the event.
- Subsequent writes: append only the event section.
- Detection: `fs.stat` the file; if ENOENT, write header first.
- Each event:

```
## <timestamp>｜<eventType>

<!-- ocn-event
<key: value lines for metadata>
-->

<message.zh>
<message.en>
[optional Related paths block]
[optional Related artifact ids block]
```

### 4.7 `writeAuditEvent` (src/core/audit/audit-writer.ts)

```ts
import { appendAuditJsonl } from "./audit-jsonl.js";
import { appendAuditMarkdown } from "./audit-markdown.js";
import type { AuditEvent } from "../../types/audit.js";

export interface WriteAuditEventResult {
  jsonlOk: boolean;
  markdownOk: boolean;
  warning?: string;
}

export async function writeAuditEvent(
  root: string,
  event: AuditEvent,
): Promise<WriteAuditEventResult> {
  await appendAuditJsonl(root, event); // throws on failure — caller catches
  try {
    await appendAuditMarkdown(root, event);
    return { jsonlOk: true, markdownOk: true };
  } catch (err) {
    return {
      jsonlOk: true,
      markdownOk: false,
      warning: `audit markdown failed: ${(err as Error).message}`,
    };
  }
}
```

### 4.8 Command-level emitters

Each command imports a small private helper that:
1. Builds the event with `createAuditEvent`.
2. Calls `writeAuditEvent`.
3. On failure, writes a stderr warning prefixed `audit:` and returns. **Never throws; never affects command result.**

Example (init.ts):

```ts
async function emitInitAudit(opts: InitOptions, state: ProjectState, paths: InitData) {
  await safeAudit(opts.cwd, createAuditEvent({
    eventType: "project_initialized",
    result: "success",
    actor: "user",
    source: "cli",
    projectRoot: opts.cwd,
    currentStateId: state.currentStateId,
    currentStepId: state.currentStepId,
    command: "init",
    message: msg("OCN project initialized.", "已在 OCN 中初始化项目。"),
    relatedPaths: [paths.stateFile, paths.sopFile, paths.gatesFile, paths.configFile],
    data: { tier: state.project.tier, sopProfileId: state.project.sopProfileId, sopProfileVersion: state.project.sopProfileVersion },
  }));
}

async function safeAudit(root: string, event: AuditEvent): Promise<void> {
  try { await writeAuditEvent(root, event); }
  catch (err) { process.stderr.write(`audit: failed to record ${event.eventType}: ${(err as Error).message}\n`); }
}
```

### 4.9 Lock lifecycle integration (src/core/state/lock.ts edit)

Add (without breaking existing API):

```ts
export interface LockLifecycleHook {
  onAcquired?: (handle: LockHandle) => void | Promise<void>;
  onReleased?: (handle: LockHandle) => void | Promise<void>;
  onTimeout?: (err: LockTimeoutError) => void | Promise<void>;
  onStaleRecovered?: (handle: LockHandle) => void | Promise<void>;
}

export interface AcquireLockOptions {
  // ... existing fields
  readonly lifecycle?: LockLifecycleHook;
}
```

Wire calls:
- `acquireLock` calls `lifecycle?.onStaleRecovered` immediately after a successful reclaim acquire.
- `acquireLock` calls `lifecycle?.onAcquired` on every successful acquire (including reclaim).
- `acquireLock` calls `lifecycle?.onTimeout` then re-throws on timeout.
- `releaseLock` calls `lifecycle?.onReleased` after successful unlink.

All hook invocations are wrapped in `try/catch` that swallows hook errors so a flaky audit cannot break the lock contract. (Hook errors are intentionally silent — the audit subsystem itself logs to stderr if its emitter fails.)

A factory in `src/core/audit/lock-audit.ts` builds a `LockLifecycleHook` that emits the four lock-related audit events with appropriate `message`s and `data`.

### 4.10 Wired sites

| Site | Events emitted | Notes |
|---|---|---|
| `init.ts` (success) | `project_initialized`, lock-cycle (acquired/released or stale_recovered), `state_write_succeeded` | Emission AFTER outer lock released. |
| `init.ts` (timeout) | `lock_timeout` | From hook; init returns blocked `ERR_IO_OR_CONFIG`. |
| `init.ts` (already-initialized) | NONE | No state write happened; no lock event in this PR. (Future PR may add `init_blocked`.) |
| `state-store.writeStateAtomic` | `state_write_succeeded` or `state_write_failed`, lock-cycle | Emission AFTER lock released. |
| `init.ts` (uses writeStateUnlocked) | `state_write_succeeded` is emitted by init itself, not by writeStateUnlocked | writeStateUnlocked stays pure. |
| `doc.ts` (success) | `artifact_created` | Includes artifactPath. |
| `check.ts` (always) | `artifact_gate_run` (result=executed) | Records every check call. |
| `check.ts` (blocked) | `artifact_gate_blocked` (result=blocked) | Includes missingRequiredSectionIds. |
| `check.ts` (pass) | `artifact_gate_passed` (result=pass) | Includes status="pass". |
| `status.ts`, `brief.ts` | NONE | Reads only — per CLAUDE.md §4.7 status does not write audit. |

**`state_write_started` is NOT emitted** in this PR (per user §VIII §2 alternative). Rationale: the only useful invariant is whether the write completed; emitting `started` doubles JSONL volume and adds ambiguity if the process crashes between started and succeeded. We can add it in a later PR if instrumentation needs it.

---

## 5. Acceptance Criteria

### 5.1 Functional

- [ ] `.ocoding/audit/audit-events.jsonl` is created on first audit emission and contains valid JSON-per-line.
- [ ] `docs/22-audit-trail.md` is created with header on first audit emission.
- [ ] `ocn init` (success) writes `project_initialized` + `state_write_succeeded` + `lock_acquired` + `lock_released` to JSONL and Markdown.
- [ ] `ocn doc create prd` (success) writes `artifact_created`.
- [ ] `ocn check` (blocked) writes `artifact_gate_run` then `artifact_gate_blocked` (two events, in order).
- [ ] `ocn check` (pass) writes `artifact_gate_run` then `artifact_gate_passed`.
- [ ] All emitted events parse against `AuditEvent` zod schema.
- [ ] Event `timestamp` ends with `Z`; `eventId` matches ULID regex.
- [ ] When JSONL append fails, Markdown is NOT written.
- [ ] When Markdown append fails, JSONL has already been written and the command succeeds.
- [ ] Audit emission failure does NOT change the command's exit code or `CommandResult` `ok` field for any of the 5 spike commands.

### 5.2 Concurrency / safety

- [ ] Audit writer never acquires `.ocoding/.lock`.
- [ ] Audit writer never calls `writeState` / `writeStateAtomic` / `writeStateUnlocked`.
- [ ] Lock lifecycle hooks are called outside any held lock (after release for `onReleased`, before throw for `onTimeout`).
- [ ] Lock lifecycle hook errors are caught — they cannot break the lock contract (verified by a unit test that throws inside a hook).

### 5.3 Quality gates

- [ ] All 152 existing tests still pass.
- [ ] New tests added (target: ~40-50).
- [ ] `src/core/audit/*.ts` line coverage ≥ 85%.
- [ ] All-files coverage ≥ 70% (current threshold).
- [ ] No file > 300 lines in target tree.
- [ ] `npm run lint && npm run typecheck && npm run build && npm run test:coverage` all green.
- [ ] G2 demo (verbatim 8-command spec) still passes.
- [ ] Pre-commit hook green.

### 5.4 Documentation

- [ ] `implementation-notes.md` L3 marked **RESOLVED by PR #3**.
- [ ] `implementation-notes.md` §9 (or next available) PR #3 addendum: scope, deferred items (event replay, audit rebuild, doctor integration, log/decision-log/research-log subsystems).
- [ ] No edits to `docs/00-08`.
- [ ] Amendment Needed flag captured for `.ocoding/events/` vs `.ocoding/audit/` and `docs/21-` vs `docs/22-` discrepancy (see §9 below).

---

## 6. System-Wide Impact

### 6.1 Interaction graph (post-PR-#3)

```
ocn check (blocked path)
  → check.checkCurrentArtifact(opts)
    → readState(cwd)               [no audit; reads only]
    → loadSopProfile()             [no audit]
    → fs.readFile(prd)             [no audit]
    → parseHeadings + matchSection [no audit]
    → computeArtifactGateStatus
    ← returns CommandResult
  ← (BEFORE outputResult)
    → safeAudit(gate_run, executed)
    → safeAudit(gate_blocked, blocked)
  ← outputResult(result, opts)
    → process.stdout.write / stderr / exit
```

The audit hooks live at the command boundary, NOT inside core algorithms. This keeps `core/` mostly pure and makes audit a cross-cutting concern that can be turned off via a noop emitter for tests if needed.

### 6.2 Error & failure propagation

| Layer | Error class | Propagation |
|---|---|---|
| `appendAuditJsonl` | `NodeJS.ErrnoException` | bubbles to `writeAuditEvent` |
| `writeAuditEvent` | `Error` (jsonl path) | bubbles to `safeAudit` |
| `safeAudit` | swallowed; warning to stderr | command continues normally |
| Lock lifecycle hook | swallowed in lock module | lock contract intact |

### 6.3 State lifecycle risks

- Audit JSONL is append-only by construction — no overwrite, no rename, no temp file. The only way to corrupt it is a partial `write(2)` that splits a line, which POSIX guarantees against for buffers ≤ PIPE_BUF.
- Markdown is also append-only. A partial markdown write could leave a torn h2 section but would not affect JSONL (the source of truth).
- Audit failures never affect `state.json` because the audit writer never touches it.
- Lock contract: hook errors do not propagate; lock release is unconditional in `withLock`'s `finally` block.

### 6.4 API surface parity

Audit emission lives at the **command boundary** in `src/cli/commands/*.ts` ... wait, no — actually in `src/core/{init,doc,check}.ts` (the core fns). The CLI layer remains a thin renderer of `CommandResult`. This matches PR #1's composition. Future MCP exposure (PR #5) of read-only tools doesn't trigger audit; only state-mutating tools do (none in PR #5 per scope).

### 6.5 Integration test scenarios

1. **Empty dir → init → check JSONL** has exactly one valid `project_initialized` line plus the lock + state-write entries.
2. **init → doc create → check (blocked) → JSONL** has the right ordered sequence.
3. **JSONL fs.appendFile throws (mock fs)** → no markdown written; init still returns success (audit is best-effort).
4. **Markdown fs.appendFile throws (mock fs)** → JSONL still has the line; init still returns success; stderr has `audit:` warning.
5. **A lock lifecycle hook throws synchronously inside `withLock`** → lock still released; outer command unaffected.
6. **Stale lock reclaim** (re-use the PR #2 stale-lock fixture) → emits `lock_stale_recovered` exactly once.

---

## 7. Implementation Phases

### Phase A — Schema + factory (foundation)

1. `src/types/audit.ts` (zod schema)
2. `src/core/audit/audit-paths.ts` (paths)
3. `src/core/audit/audit-event.ts` (factory using ulid)
4. Re-export from `src/types/index.ts`
5. `tests/unit/audit-event-schema.test.ts`
6. `tests/unit/audit-event-factory.test.ts`

### Phase B — Writers

1. `src/core/audit/audit-jsonl.ts`
2. `src/core/audit/audit-markdown.ts`
3. `src/core/audit/audit-writer.ts` (orchestrator)
4. `src/core/audit/index.ts` (barrel)
5. `tests/unit/audit-writer-jsonl.test.ts`
6. `tests/unit/audit-writer-markdown.test.ts`
7. `tests/unit/audit-writer-failure.test.ts` (use `vi.spyOn(fs, "appendFile")` to inject failures)

### Phase C — Lock lifecycle hook

1. Edit `src/core/state/lock.ts` — add `LockLifecycleHook` + `lifecycle` option
2. `src/core/audit/lock-audit.ts` — `makeLockAuditHook(root, command)` factory
3. `tests/unit/lock-audit-hook.test.ts` — hook fires correctly + errors swallowed

### Phase D — Command wiring

1. Edit `src/core/init.ts` — emit `project_initialized` + `state_write_succeeded` + lock-cycle audits.
2. Edit `src/core/state/state-store.ts` — emit `state_write_succeeded` / `state_write_failed` from `writeStateAtomic` (NOT from writeStateUnlocked, which is called inside an outer lock by init).
3. Edit `src/core/doc.ts` — emit `artifact_created` on success.
4. Edit `src/core/check.ts` — emit `artifact_gate_run` then result-specific event.
5. `tests/cli/audit-init.test.ts`
6. `tests/cli/audit-doc-create.test.ts`
7. `tests/cli/audit-check.test.ts`

### Phase E — Documentation

1. Update `implementation-notes.md` — L3 RESOLVED, §9 addendum, Amendment Needed flag for `audit/` vs `events/` directory naming.
2. Verify all 152 prior tests + new audit tests pass.
3. Run `npm run lint && typecheck && build && test:coverage` to gate.

---

## 8. Alternative Approaches Considered

| Approach | Rejected because |
|---|---|
| Lock-protected JSONL writes | POSIX append for < PIPE_BUF is already atomic; the lock is unneeded overhead and risks deadlock. |
| Single combined file (audit-trail.md only, no JSONL) | The user spec mandates dual persistence; markdown is not a structured query target. |
| `fs.open(path, "a")` + manual write per call | `fs.appendFile` already does this internally and provides a simpler API. |
| ULID via in-house impl (no dep) | `ulid` already in PR #1 deps; no reason to reinvent. |
| `crypto.randomUUID()` instead of ULID | Loses lexicographic time-sort. ULID is already there. |
| Audit-must-succeed for `init` (rollback init on audit failure) | Out of scope — audit is best-effort in PR #3; an OCN runtime that refuses to init because audit failed is worse UX than a missing audit line. PR #4+ may upgrade selected events. |
| Emit lock events inside the lock callback (closer to action) | User §VI explicitly forbids; risks recursive lock perception even if not actual deadlock. Hook fires after release. |
| Move audit emission to CLI layer (`src/cli/commands/*.ts`) | Audit is a core concern; multiple entry points (current CLI, future MCP) need the same emission. Keeping it in `src/core/` ensures parity. |

---

## 9. Amendment-Needed Flags (record only — do NOT edit docs/00-08)

Discovered during planning, captured here per user spec §XII:

### 9.1 Audit storage path

| | Value used | Authoritative source |
|---|---|---|
| Design (`docs/05-data-model.md` §...) | `.ocoding/events/audit-events.jsonl` | docs/05 + docs/06 |
| Design (`docs/05-data-model.md` §...) | `docs/21-audit-trail.md` | docs/05 + docs/00 §12 |
| **PR #3 user spec** | `.ocoding/audit/audit-events.jsonl` | user §IV |
| **PR #3 user spec** | `docs/22-audit-trail.md` | user §IV + §VII |

PR #3 follows the **user spec verbatim**. Amendment needed in `docs/05-data-model.md` and `docs/06-api-contract.md` to reconcile (or, conversely, the user spec needs to align with design — that's the project owner's call).

### 9.2 Event taxonomy delta

PR #3 implements 12 event types; design (`docs/05-data-model.md` §12.15) includes a wider list (`gate_failed`, `advance_*`, `sop_version_*`, `doctor_run`, `reset_executed`, etc.). PR #3's 12 are a strict **subset** — none added, none removed beyond what user §V listed. Future PRs (#4, #5) will introduce the remaining types.

---

## 10. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | POSIX append assumption fails on Windows or networked filesystems | L | M | CI runs on Linux. Document the assumption in `audit-jsonl.ts` JSDoc. Phase 2 PR #4 may revisit if cross-platform lands. |
| R2 | Audit emission becomes load-bearing for command success and breaks future commands | M | M | safeAudit wrapper in every command; tests verify command success even when audit throws. |
| R3 | Hook errors break lock contract | L | H | All hook invocations wrapped in try/catch within lock module; unit test asserts a throwing hook does not orphan the lock. |
| R4 | Markdown audit drifts from JSONL over time | M | L | JSONL is source of truth; markdown is a view. PR #3 does not need them to be byte-equivalent. Phase 2 PR may add a rebuild tool. |
| R5 | ULID dependency removed in future cleanup | L | M | Pin in package.json (already exact version). |
| R6 | Audit volume on a busy run (many `check` calls) bloats markdown | L | L | Acceptable for spike tier; PR #4+ may add rotation policy. |

---

## 11. Future Considerations (NOT in PR #3)

- Event replay and reconstruction from JSONL.
- Doctor integration: `ocn doctor` reads JSONL to detect anomalies (orphaned locks, unfinished writes).
- Audit-must-succeed mode for safety-critical events (state transitions in PR #4).
- Log subsystem (`ocn log [--type dev|decision]`) — separate from audit (push vs pull per CLAUDE.md §4.7).
- Markdown rotation when `docs/22-audit-trail.md` exceeds N MB.
- MCP exposure of `audit.read` read-only tool (PR #5+ if approved).

---

## 12. Documentation Plan

After merge:

- `implementation-notes.md` — L3 RESOLVED, §9 PR #3 addendum, Amendment Needed flag.
- (No edits to `docs/00-08`.)
- Plan file (this) stays in `docs/plans/` as historical record.
- DEC-001's "Approved Next PR Order" remains accurate; no decision-log entry needed since PR #3 doesn't change the ordering.

---

## 13. Sources & References

### Internal

- `CLAUDE.md` §4.7 (audit push/pull rules), §10 (AI governance — AI must NOT modify SOP)
- `.claude/rules.md` §5 (audit event rules)
- `.claude/anti-patterns.md` §3 (silent error swallowing — relevant exception: audit IS deliberately swallowed at command level, but always logs to stderr)
- `docs/00-project-brief.md` §13 (cross-cutting obligations: `obligation_audit_trail` activates at first push event after `ocn init`)
- `docs/05-data-model.md` §12.15 AuditEventType, §3.7 markdown vs structured runtime data
- `docs/06-api-contract.md` §467 AuditEventType triggers, §487 dual persistence
- `docs/07-test-strategy.md` §1515-1580 audit event persistence + failure injection scenarios
- `docs/19-decision-log.md` DEC-001 §"Approved Next PR Order" (PR #3 = Audit + Event Foundation)
- `docs/plans/2026-04-28-feat-ocn-skeleton-spike-phase0-phase1-plan.md` (PR #1 baseline)
- `docs/plans/2026-04-28-feat-ocn-phase2-state-safety-plan.md` (PR #2 baseline)
- `implementation-notes.md` L3 (audit gap), §8 (PR #2 addendum noting deferred audit hooks)

### External

- POSIX `write(2)` atomicity guarantee for `O_APPEND` writes ≤ PIPE_BUF
- Node.js `fs.appendFile` defaults to `'a'` flag (O_APPEND on POSIX)
- ULID spec: `https://github.com/ulid/spec`

---

## 14. Plan Verification Checklist

- [x] Plan filename uses `YYYY-MM-DD-feat-<descriptive>-plan.md` format
- [x] Scope is strictly limited (no advance, no MCP, no doctor, no reset, no baseline)
- [x] L3 closure path is explicit
- [x] Deadlock prevention is the central design point and is addressed
- [x] Failure semantics for both JSONL-fail and Markdown-fail are specified
- [x] Tests planned cover schema, writers, failure paths, and CLI integration
- [x] eventId scheme decided (ULID) with rationale
- [x] Amendment-Needed flag captured for path discrepancy
- [x] Acceptance criteria measurable

---

**END OF PLAN**

Plan written to `docs/plans/2026-04-28-feat-ocn-phase2-audit-event-foundation-plan.md`.

Pipeline mode (LFG) — next step is `/compound-engineering:deepen-plan` for targeted pin-downs (POSIX-append guarantee scope, hook-error semantics, ULID interop).

---

## 15. Amendments (post `/deepen-plan` round 1, 2026-04-28)

> Targeted deepening, pipeline mode. Original plan unchanged — only the four blocking ambiguities below are pinned down.

### 15.1 POSIX append atomicity — scope and assertion

**Confirmed:**

1. Node.js `fs.appendFile(path, data, options)` defaults to `flag: 'a'`, which translates to `O_APPEND` on POSIX (Linux/macOS) and `FILE_APPEND_DATA` on Windows NTFS. Both kernel modes guarantee the seek+write pair is atomic for a single underlying syscall.
2. The PIPE_BUF guarantee in POSIX strictly applies to **pipes**. For **regular files** with `O_APPEND`, the formal POSIX wording does not pin a buffer-size limit, but in **practice** Linux ext4/xfs/btrfs and macOS APFS hold writes within a page (typically 4096 bytes) atomic. Windows NTFS handles `FILE_APPEND_DATA` per write-call atomically.
3. **Network filesystems (NFS, SMB) do NOT guarantee cross-host atomicity.** Out of scope for OCN spike (local-first, single host).
4. AuditEvent JSON line size: ~200-700 bytes typical (without `data`), up to ~1500 bytes with paths arrays. Worst-case if `data` carries unbounded payload — could exceed 4096 bytes.

**Action**: Add a defensive size assertion in `appendAuditJsonl`:

```ts
const MAX_AUDIT_LINE_BYTES = 3500; // conservative — well under common 4096 page size
const line = JSON.stringify(event) + "\n";
if (Buffer.byteLength(line, "utf8") > MAX_AUDIT_LINE_BYTES) {
  throw new Error(
    `AuditEvent line exceeds ${MAX_AUDIT_LINE_BYTES} bytes (${Buffer.byteLength(line, "utf8")}). ` +
    "Trim the 'data' field or split the event.",
  );
}
await fs.appendFile(target, line, "utf8");
```

The size cap is enforced in the writer rather than the schema because schema cannot bound serialized size cheaply. The assertion turns a silent torn-write into a loud failure that propagates to the command's `safeAudit` warning.

**JSDoc note (verbatim, to land in `audit-jsonl.ts`)**:

```ts
/**
 * Append a single AuditEvent line to .ocoding/audit/audit-events.jsonl.
 *
 * Atomicity: relies on POSIX O_APPEND (Linux/macOS) and Windows
 * FILE_APPEND_DATA semantics — a single fs.appendFile call writes the
 * entire buffer in one underlying syscall, so concurrent appends on the
 * same host do not interleave bytes within a line. This holds for buffers
 * within a filesystem page (typically 4096 bytes); we enforce a 3500-byte
 * conservative cap to stay safely under that boundary.
 *
 * NOT guaranteed on networked filesystems (NFS/SMB across hosts). OCN is
 * local-first; cross-host concurrent writes are out of scope.
 */
```

### 15.2 ULID regex — confirmed correct

Crockford Base32 alphabet (32 chars): `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Excluded letters: **I, L, O, U**. The plan's regex `/^[0-9A-HJKMNP-TV-Z]{26}$/` decomposes cleanly:

- `0-9` → 10 digits
- `A-H` → 8 letters (A B C D E F G H)
- `J` → 1 (skipping I)
- `K` → 1
- `M-N` → 2 (skipping L)
- `P-T` → 5 (skipping O)
- `V-Z` → 5 (skipping U)

Total = 32 chars. ULID is 128 bits encoded in 26 base32 chars. The `ulid` npm package emits uppercase canonical form by default, matching the regex. **No change to the schema.** Lower-case ULIDs (RFC 4648 base32 lowercase) would NOT pass — that's a deliberate strict choice.

### 15.3 Lock lifecycle hook — async ordering semantics

**Decision: hooks ARE awaited within `withLock`, but cross-process audit ordering under contention is best-effort.**

Concretely:

```ts
async function withLock<T>(opts, op) {
  const handle = await acquireLock(opts);
  // onAcquired fires AFTER lock taken, BEFORE op
  if (opts.lifecycle?.onAcquired) {
    try { await opts.lifecycle.onAcquired(handle); } catch (_e) { /* swallow */ }
  }
  try {
    return await op(handle);
  } finally {
    await releaseLock(handle);
    // onReleased fires AFTER unlink, BEFORE withLock returns
    if (opts.lifecycle?.onReleased) {
      try { await opts.lifecycle.onReleased(handle); } catch (_e) { /* swallow */ }
    }
  }
}
```

**Single-process ordering** (audit lines emitted by one Node process) is preserved: `lock_acquired` always lands in JSONL before any subsequent `lock_released` for the same withLock invocation, because the two awaits run sequentially.

**Cross-process ordering** is best-effort: process A's `lock_released` audit emission runs after `releaseLock` returns. By that point, the lock file is gone, and process B's `acquireLock` may have already resumed and emitted `lock_acquired`. The two events end up in possibly-interleaved order in JSONL, but each line carries its own `timestamp` (ISO 8601 UTC) and `eventId` (ULID — also lex-time-sortable). Downstream tooling can re-sort by timestamp.

**Hook errors are silently swallowed** in `withLock`. The lock contract takes priority. The audit hook implementation in `lock-audit.ts` is responsible for its own stderr warning if `writeAuditEvent` throws — `withLock` itself never logs.

### 15.4 Markdown first-write race — exclusive-create for header

**Decision: use `fs.open(path, 'wx')` for header creation, fall back to `appendFile` for body.**

```ts
async function appendAuditMarkdown(root: string, event: AuditEvent): Promise<void> {
  const file = Paths.markdownFile(root);
  await fs.mkdir(dirname(file), { recursive: true });

  // Attempt exclusive create. EEXIST means another writer already created it.
  try {
    const handle = await fs.open(file, "wx");
    try {
      await handle.writeFile(MARKDOWN_HEADER, "utf8");
    } finally {
      await handle.close();
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    // file already exists — fall through to body append
  }

  // Append the event section. Same POSIX append atomicity as JSONL,
  // sized in tens to a few hundred lines per event.
  await fs.appendFile(file, renderMarkdownSection(event), "utf8");
}
```

This eliminates the dual-header race that would have arisen if both processes saw `fs.stat` ENOENT simultaneously. Body appends remain racy for cross-process sequence ordering (same caveat as §15.3), but the file is structurally sound: one header, N event sections, all parseable.

**Test addition (already implied by the plan but pinning here)**: in `tests/unit/audit-writer-markdown.test.ts`, add a "concurrent first-write" assertion — spawn two parallel `appendAuditMarkdown` calls on a fresh dir, assert the resulting file has exactly ONE `# Audit Trail` header line.

### 15.5 Minor pin-downs surfaced during deepening

- **MARKDOWN_HEADER constant** (~150 bytes) lives in `audit-markdown.ts`. Inline strings are fine for a single-version spike.
- **renderMarkdownSection** must round-trip every event field that's set; use `BilingualMessage` rendering as `<zh>\n<en>` (matches PR #1 text renderer convention).
- **Empty `relatedPaths` / `relatedArtifactIds`** must NOT render an empty list in markdown. Detect length === 0 and skip the section header.
- **Test note for §15.4**: don't test concurrent markdown writes with `setTimeout` jitter — use `Promise.all` over two `appendAuditMarkdown` calls; vitest fake timers and real fs interact poorly.

---

**END OF AMENDMENTS — PLAN IS NOW LOCKED FOR `/workflows:work` EXECUTION.**
