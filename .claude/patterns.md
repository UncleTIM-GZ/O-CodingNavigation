# OCN — Recommended Patterns

> Patterns we want to see in OCN's TypeScript codebase. Companion to `CLAUDE.md` and `.claude/rules.md`.

---

## 1. Schema-first Module

Every module that owns a data shape starts with zod schemas in `src/types/` (or a local `*.schema.ts`), and the implementation imports the inferred type — never re-declares it.

```ts
// src/types/state.ts
import { z } from "zod";
export const StateId = z.enum(["state_discovery", "state_spec", /* ... */]);
export type StateId = z.infer<typeof StateId>;

// src/core/state/state-store.ts
import { type StateId, ProjectState } from "../../types/state.js";
```

---

## 2. Result Pattern (no exceptions for business failures)

```ts
type Ok<T> = { status: "ok"; exitCode: 0; data: T };
type Blocked = {
  status: "blocked";
  exitCode: 1 | 2 | 3 | 4 | 5;
  errorCode: ErrorCode;
  message: BilingualMessage;
  details?: unknown;
};
export type CommandResult<T = unknown> = Ok<T> | Blocked;

export const ok = <T>(data: T): Ok<T> => ({ status: "ok", exitCode: 0, data });
export const blocked = (
  errorCode: ErrorCode,
  exitCode: 1 | 2 | 3 | 4 | 5,
  message: BilingualMessage,
  details?: unknown,
): Blocked => ({ status: "blocked", exitCode, errorCode, message, details });
```

Callers use exhaustive discrimination, not `try/catch`, for expected business outcomes.

---

## 3. Guard Clauses + Early Return

```ts
// ✅
async function getStatus(opts: StatusOptions): Promise<CommandResult<StatusData>> {
  const stateFile = path.join(opts.cwd, ".ocoding/state.json");
  if (!(await pathExists(stateFile))) {
    return blocked("ERR_IO_OR_CONFIG", 4, msg("OCN not initialized in this directory.", "当前目录未初始化 OCN。"));
  }
  const raw = await readJson(stateFile);
  const parsed = ProjectState.safeParse(raw);
  if (!parsed.success) {
    return blocked("ERR_STATE_MACHINE", 3, msg("Invalid state.json", "state.json 不合法"), parsed.error.issues);
  }
  // main path now flat
  return ok(buildStatusData(parsed.data));
}
```

---

## 4. Composition Over Inheritance

```ts
// ✅ small composable functions
const withAuditOnPush = <Args extends unknown[], R>(
  type: AuditEventType,
  fn: (...args: Args) => Promise<R>,
) => async (...args: Args): Promise<R> => {
  const result = await fn(...args);
  await audit.write({ type, /* ... */ });
  return result;
};

export const advanceState = withAuditOnPush("state_transition_attempt", advanceStateImpl);
```

No class hierarchies. No mixins. No decorators in v1.0.

---

## 5. Pure Core, Effectful Edges

Core Engine functions take explicit dependencies (filesystem, clock, audit writer) as parameters. This makes them testable without mocks-on-modules.

```ts
type Deps = {
  fs: FileSystem;       // a small interface, not node:fs directly
  clock: Clock;         // returns ISO UTC string
  audit: AuditWriter;
  lock: LockProvider;
};

export async function checkCurrentArtifact(deps: Deps, input: CheckInput): Promise<CommandResult<CheckData>> {
  // pure-ish: all side effects flow through deps
}
```

Tests inject fakes. Production wires real implementations in `src/cli/index.ts` (composition root).

---

## 6. Stable ID Helpers

```ts
// src/core/id.ts
const STATE_PREFIX = "state_";
const STEP_PREFIX = "step_";

export const isStateId = (s: string): s is StateId => StateId.safeParse(s).success;
export const isStepId  = (s: string): boolean => s.startsWith(STEP_PREFIX);

export function assertStableId(s: string, prefix: string): void {
  if (!s.startsWith(prefix)) {
    throw new OcnError(`Expected stable ID with prefix ${prefix}, got ${s}`, "ERR_STATE_MACHINE");
  }
}
```

---

## 7. BilingualMessage Constructor

```ts
// src/core/i18n.ts
export type BilingualMessage = { en: string; zh: string };
export const msg = (en: string, zh: string): BilingualMessage => ({ en, zh });

// usage everywhere:
return blocked("ERR_ARTIFACT_INVALID", 2, msg(
  "Required section missing: Scenarios",
  "缺少必需章节：Scenarios | 使用场景",
));
```

Every error-creation site reads obviously bilingual.

---

## 8. ULID for IDs

```ts
import { ulid } from "ulid";
export const newAuditEventId = (): string => ulid();   // sortable, no collision
```

Use ULID for all generated event/baseline IDs. Stable string IDs (`state_*`, `step_*`) are vocabulary-defined, not generated.

---

## 9. AsyncIterable for streaming reads

For audit log reads (`.ocoding/audit/*.jsonl`), use async generators rather than reading the whole file:

```ts
export async function* readAuditEvents(path: string): AsyncIterable<AuditEvent> {
  const stream = createReadStream(path);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    yield AuditEvent.parse(JSON.parse(line));
  }
}
```

---

## 10. Single Composition Root

`src/cli/index.ts` is the ONLY place that wires real `node:fs`, `node:path`, system clock, and lock provider. Everything else takes them as injected `Deps`. This keeps testing easy and makes future MCP entry point a parallel composition root with the same shape.

---

## 11. Test Fixtures as First-class Code

`tests/fixtures/` is canonical. When data model changes, fixtures update with it in the same commit.

```
tests/fixtures/
├── projects/
│   ├── empty/                                    # bare directory
│   ├── valid-minimal/                            # ocn init --tier minimal output
│   │   ├── .ocoding/state.json
│   │   ├── .ocoding/sop.yaml
│   │   └── docs/00-project-brief.md
│   └── corrupt-state/
├── artifacts/
│   ├── prd-missing-scenarios.md
│   └── prd-with-scenarios.md
└── sop/
    └── skeleton-spike-sop.yaml
```

Tests reference fixtures via relative paths. Never embed large doc strings in test files.

---

## 12. Bilingual Snapshot Conventions

Snapshots for CLI human output use a stable locale order: `zh\nen` for default, `en\nzh` when `LANG=en_*` env is set. Tests pin the locale explicitly:

```ts
it("renders blocked PRD with bilingual message", async () => {
  process.env.LANG = "zh_CN.UTF-8";
  const result = await runCli(["check"], fixtureProject("prd-missing-scenarios"));
  expect(result.stderr).toMatchInlineSnapshot();
  expect(result.exitCode).toBe(2);
});
```
