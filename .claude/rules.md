# OCN — Detailed Engineering Rules

> Companion to `CLAUDE.md`. These rules elaborate on the hard constraints with TypeScript-specific guidance for OCN.

---

## 1. TypeScript Rules

### 1.1 Schemas are the source of truth

Every public data structure starts as a **zod schema**. The TypeScript type is **inferred**, never duplicated.

```ts
// ✅ correct
import { z } from "zod";

export const StateId = z.enum([
  "state_discovery", "state_spec", "state_design", "state_plan",
  "state_build", "state_verify", "state_ship", "state_reflect",
]);
export type StateId = z.infer<typeof StateId>;

export const ProjectState = z.object({
  schemaVersion: z.literal("1.0"),
  ocnVersion: z.string(),
  sopProfileId: z.string(),
  sopProfileVersion: z.string(),
  sopLockedAt: z.string().regex(/Z$/),     // ISO 8601 UTC ending Z
  currentStateId: StateId,
  currentStepId: z.string().regex(/^step_/),
  tier: z.enum(["minimal", "production", "full"]),
});
export type ProjectState = z.infer<typeof ProjectState>;
```

### 1.2 Strict tsconfig — no opt-outs

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 1.3 No `any`. `unknown` only at boundaries.

```ts
// ✅ at the boundary (file read, network response)
const raw: unknown = JSON.parse(content);
const state = ProjectState.parse(raw);   // throws zod error if invalid

// ❌
function getState(): any { ... }
```

### 1.4 Discriminated unions for results

```ts
// ✅ Required by API Contract — every command returns this
export type CommandResult<T = unknown> =
  | { status: "ok"; exitCode: 0; data: T }
  | { status: "blocked"; exitCode: 1 | 2 | 3 | 4 | 5; errorCode: ErrorCode; message: BilingualMessage; details?: unknown };

// caller forced to discriminate
if (result.status === "ok") {
  // result.data available
} else {
  // result.errorCode available
}
```

### 1.5 `readonly` and immutable

```ts
// ✅ produce new objects
function setStep(state: ProjectState, stepId: StepId): ProjectState {
  return { ...state, currentStepId: stepId };
}

// ❌ never mutate
function setStep(state: ProjectState, stepId: StepId): void {
  state.currentStepId = stepId;       // forbidden
}
```

Use `readonly` on type fields where they should never be reassigned after construction.

---

## 2. State File Safety｜实现细节

The state-store module owns ALL writes to `.ocoding/state.json`. No other module writes this file.

```ts
// pseudocode — actual impl in src/core/state/state-store.ts
async function writeStateAtomic(state: ProjectState): Promise<void> {
  const lock = await acquireLock(".ocoding/.lock", { timeoutMs: 5000 });
  try {
    if (existsSync(".ocoding/state.json")) {
      await fs.copyFile(".ocoding/state.json", ".ocoding/state.json.bak");
    }
    const tmp = `.ocoding/state.json.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(tmp, ".ocoding/state.json");
  } finally {
    await lock.release();
  }
}
```

Tests required (Layer 6):
- two concurrent writers → only one succeeds, file integrity preserved
- writer killed mid-write → backup recoverable
- lock timeout → returns `ERR_IO_OR_CONFIG`

---

## 3. CLI Rules

### 3.1 Output channels

| Channel | Audience | Content |
|---|---|---|
| stdout | success data, `--json` payload | structured |
| stderr | warnings, errors, progress | bilingual human messages |
| exit code | scripts / CI | per CLAUDE.md §4.6 |

### 3.2 `--json` mode

Every command supporting structured output accepts `--json`. In `--json` mode:
- ALL stdout is a single valid JSON object (one of `CommandResult`).
- No human prose on stdout.
- Errors still go to stderr but stdout still contains JSON result.

### 3.3 Bilingual rendering

Default human renderer prints `zh\nen` (or `en\nzh` based on locale). Both must be present.

```ts
function render(msg: BilingualMessage, locale: "zh" | "en" = "zh"): string {
  return locale === "zh" ? `${msg.zh}\n${msg.en}` : `${msg.en}\n${msg.zh}`;
}
```

### 3.4 No business logic in commands

```ts
// ✅
export async function statusCmd(opts: StatusOptions): Promise<CommandResult<StatusData>> {
  const result = await core.getStatus(opts);
  return result;
}

// ❌ business logic in CLI layer
export async function statusCmd(opts) {
  const state = JSON.parse(await fs.readFile(".ocoding/state.json", "utf8"));
  if (state.currentStepId === "step_prd") { /* ... */ }
}
```

---

## 4. Markdown Artifact Rules

### 4.1 Required Sections — canonical + alias

The Markdown parser must accept both English canonical headings and Chinese alias headings:

```
# Scenarios          ← canonical
# 使用场景           ← alias (zh)
# Scenarios | 使用场景   ← canonical-alias combined
```

The required-section matcher:
```ts
function matchRequiredSection(
  headings: string[],
  required: { canonical: string; aliases: string[] }
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const targets = new Set([required.canonical, ...required.aliases].map(norm));
  return headings.some(h => targets.has(norm(h)));
}
```

### 4.2 Empty-section detection

Section header alone is not enough — section must contain non-whitespace, non-comment content. The parser returns `{ heading, hasContent: boolean }`.

### 4.3 Frontmatter is optional in v1.0

Existing docs use header metadata (lines 1-15). v1.0 parser reads either YAML frontmatter or convention-based header lines.

---

## 5. Audit Event Rules

```ts
type AuditEvent = {
  eventId: string;             // ulid
  timestamp: string;           // ISO 8601 UTC ending Z
  type: AuditEventType;        // enum, push events only
  actor: { kind: "human" | "ai" | "system"; id?: string };
  source: "cli" | "mcp" | "core" | "system";
  state: { from?: StateId; to?: StateId; stepId?: StepId };
  result: AuditResult;         // "ok" | "blocked" | "override" | "error"
  reason?: BilingualMessage;
  payload?: Record<string, unknown>;
};
```

Push event types (auto-write):
- `state_transition_attempt`, `state_transition_succeeded`, `state_transition_blocked`
- `gate_executed`, `gate_failed`, `gate_overridden`
- `sop_version_detected`, `sop_version_diff`
- `baseline_created`
- `high_risk_action_blocked`

Audit is appended to:
- `.ocoding/audit/<yyyy-mm>.jsonl` (machine source of truth)
- `docs/21-audit-trail.md` (human narrative — append-only summary)

---

## 6. Error Handling Rules

### 6.1 Two distinct categories

| Category | Definition | Handling |
|---|---|---|
| **Business Failure** | Expected workflow outcome (gate blocked, artifact missing) | Return `CommandResult` with `status: "blocked"` and proper `errorCode`. Exit code 1-5. |
| **Unexpected Error** | System invariant broken (state.json corrupt, permission denied, lock timeout) | Throw a typed error in core; CLI layer catches and emits `errorCode: ERR_IO_OR_CONFIG`. Exit code 4. |

### 6.2 Never silently swallow

```ts
// ❌
try { await op(); } catch { /* nothing */ }

// ✅
try { await op(); }
catch (err) {
  await audit.write({ type: "error", payload: { message: String(err) } });
  throw new OcnIOError("operation failed", { cause: err });
}
```

### 6.3 Custom error classes

```ts
export class OcnError extends Error {
  constructor(message: string, public readonly errorCode: ErrorCode, opts?: { cause?: unknown }) {
    super(message);
    this.name = "OcnError";
    if (opts?.cause) (this as any).cause = opts.cause;
  }
}
export class OcnIOError extends OcnError { /* ERR_IO_OR_CONFIG */ }
export class OcnGateError extends OcnError { /* ERR_GATE_FAILED */ }
// etc.
```

---

## 7. Testing Rules

### 7.1 Layer-specific test directories

```
tests/unit/             — Layer 1 (schema) + Layer 2 (core fn)
tests/gate/             — Layer 3 (artifact gate)
tests/cli/              — Layer 4 (CLI integration)
tests/persistence/      — Layer 5 (event/file)
tests/lock/             — Layer 6 (concurrency)
tests/mcp/              — Layer 7 (MCP contract) — beta+
tests/e2e/              — Layer 8 (dogfood) — beta+
```

### 7.2 AC traceability

Every `must` AC in `docs/03-acceptance-criteria.md` ⇒ at least one test references the AC ID in its name or describe block.

```ts
describe("AC-PRD-MISSING-SCENARIOS", () => {
  it("ocn check returns blocked with exit code 2 when Scenarios section missing", async () => { /* ... */ });
});
```

A simple coverage script (Phase 1) parses ACs and asserts each `must` AC has ≥ 1 referencing test.

### 7.3 No real network or real MCP host in unit tests

Unit/integration tests use fixtures under `tests/fixtures/`. MCP protocol tests use an in-process JSON-RPC harness.

### 7.4 Snapshot tests for human-readable output

CLI render output may use snapshots, but **only after** the structured `CommandResult` is asserted directly. Never test rendered text in lieu of structured assertions.

---

## 8. Logging / Console

- Use `stderr` for progress and warnings.
- No `console.log` in core/ or src/core/. CLI render layer uses a typed logger that respects `--json` and `--no-color`.
- Never log secrets or absolute file paths outside the project root.

---

## 9. Dependency Hygiene

- Production deps: `commander`, `zod`, `js-yaml`, `ulid`, `@modelcontextprotocol/sdk` (beta+)
- Dev deps: `typescript`, `vitest`, `@vitest/coverage-v8`, `eslint`, `@typescript-eslint/*`, `prettier`
- New dep requires a one-line note in `docs/19-decision-log.md` (why this lib, alternatives considered).
- No deps with known security advisories. Check `npm audit` before each release.

---

## 10. Documentation Updates

- Editing `docs/0X-*.md` after that doc's gate-out passed = an **Amendment**. Add an "Amendment X-NNN" section at the top with date, reason, and impact. Do NOT silently edit prior decisions.
- New decisions → `docs/19-decision-log.md`.
- Bug investigations → `docs/14-debug-report.md` (one entry per investigation).
- Dev work summary → `docs/18-dev-log.md` (per PR).
