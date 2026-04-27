# OCN — Forbidden Patterns

> What NOT to do. If you see Claude or a contributor introducing any of these, stop and refactor.

---

## 1. Numeric Step Pointer (PROJECT-INVALIDATING)

```ts
// ❌ violates docs/00-project-brief.md §10 + §44 Decision 001
{ currentStep: 3 }
{ stepIndex: 2 }
{ stateNumber: 5 }
```

**Why catastrophic**: SOP versioning relies on stable IDs. The moment SOP 0.2.0 inserts a step before `step_prd`, every `currentStep: 3` in user projects silently means a different step. This is the #1 reason OCN exists — do not violate it inside OCN itself.

```ts
// ✅
{ currentStateId: "state_spec", currentStepId: "step_prd" }
```

---

## 2. Markdown as Runtime Source of Truth

```ts
// ❌ parsing docs/*.md to find current state
const md = await fs.readFile("docs/00-project-brief.md", "utf8");
const state = md.match(/当前状态：`(\w+)`/)?.[1];
```

`docs/*.md` are formal evidence + human narrative. Runtime queries read `.ocoding/state.json`, `.ocoding/sop.yaml`, `.ocoding/audit/*.jsonl`. Markdown is parsed only for **content checking** (`ocn check` matching required sections) — never for system state.

---

## 3. Silent Error Swallowing

```ts
// ❌
try { await writeStateAtomic(state); } catch { /* maybe it worked */ }

// ❌
try { await audit.write(event); } catch (e) { console.log(e); }   // log-and-forget

// ✅
try { await writeStateAtomic(state); }
catch (err) {
  await audit.write({ type: "state_write_failed", reason: msg(String(err), String(err)) }).catch(() => {});
  throw new OcnIOError("Failed to persist state", { cause: err });
}
```

Audit has a fallback (best-effort `.catch`) only because audit failures cannot themselves halt the system — but they MUST be visible in stderr.

---

## 4. Hardcoded Paths / Strings / Secrets

```ts
// ❌
const STATE = ".ocoding/state.json";    // duplicated across files
const TOKEN = "sk-live-1234";           // forbidden in source
const URL = "https://api.example.com";  // configuration belongs in config.yaml

// ✅
import { Paths } from "../core/paths.js";
const stateFile = Paths.stateFile(opts.cwd);
```

A single `Paths` module is the only place absolute or relative project paths are constructed. Configuration values come from `.ocoding/config.yaml` validated by zod.

---

## 5. `any` in Public APIs

```ts
// ❌
export function getStatus(opts: any): any { ... }
export function parse(input: unknown): unknown { ... }   // unknown out is also bad

// ✅
export function getStatus(opts: StatusOptions): Promise<CommandResult<StatusData>> { ... }
```

`unknown` is allowed at I/O boundaries (JSON.parse output, network response, FS read). It must immediately go through a zod parse before flowing further.

---

## 6. Mutating Shared State

```ts
// ❌
function setStep(state: ProjectState, step: StepId) {
  state.currentStepId = step;            // caller's object now changed
  return state;
}

// ✅
function setStep(state: ProjectState, step: StepId): ProjectState {
  return { ...state, currentStepId: step };
}
```

Even worse: mutating across module boundaries.

---

## 7. Skipping the Lock for "Just a Quick Read-Modify-Write"

```ts
// ❌
const s = JSON.parse(await fs.readFile(stateFile, "utf8"));
s.currentStepId = "step_prd";
await fs.writeFile(stateFile, JSON.stringify(s));   // race: lost update

// ✅ — use the state-store API
await stateStore.update(prev => ({ ...prev, currentStepId: "step_prd" }));
// state-store handles lock + backup + temp + rename internally
```

There is exactly ONE module that writes `.ocoding/state.json`. Every other call site goes through it.

---

## 8. Business Logic in CLI Commands

```ts
// ❌ — opening up state.json from inside cli/commands/status.ts
import { readFileSync } from "node:fs";
export const action = () => {
  const s = JSON.parse(readFileSync(".ocoding/state.json", "utf8"));
  if (s.currentStepId === "step_prd") console.log("write a PRD");
  // ...
};
```

CLI layer responsibilities: arg parsing, calling core, rendering result. Nothing else. All decisions live in `src/core/`.

---

## 9. Generating Documentation Without the Spec

```ts
// ❌ — letting AI write a PRD section without consulting docs/02-prd.md template
ocn doc create prd
# AI improvises "Goals", "Background", "Non-functional Requirements" headings

// ✅
ocn doc create prd
# Template comes from sops/default-ai-coding-sop/0.1.0/artifacts/prd.template.md
# Required sections come from gates.yaml
# AI fills the user-described content INTO the template, never re-architects it
```

---

## 10. Reaching for SQLite / Database / Cache "Just for Performance"

v1.0 explicitly rejects all of these (`docs/01-scope.md` §8.4). If a feature seems to need them, the answer is: **the feature doesn't belong in v1.0**. File it for v1.1+.

---

## 11. Exposing `navigator.advance_phase` via MCP

```ts
// ❌ in src/mcp/server.ts
mcp.registerTool("navigator.advance_phase", async (args) => {
  return await core.advanceState(args);   // FORBIDDEN in v1.0
});
```

Per `docs/01-scope.md` §5.17 + §8.11 + Decision 004: state advancement requires explicit human action via CLI. AI agents cannot advance projects in v1.0. Adding this tool is a **scope violation**, not a missing feature.

---

## 12. "Helpful" Override Without Recording

```ts
// ❌ — `ocn check --skip-required-sections`
// or any flag that bypasses gate without writing audit + override reason

// ✅ — overrides ALWAYS:
// 1. Require an explicit reason argument: --override-reason "<text>"
// 2. Write an audit event with `result: "override"` and the reason
// 3. Surface the override in subsequent `ocn status` until cleared
```

---

## 13. Comments That Restate Code

```ts
// ❌
// increment counter by one
counter++;

// load the state file from disk
const state = await loadState();

// ✅ — only comment WHY when non-obvious
// Use atomic rename because Windows EXDEV makes copy+unlink unsafe (see DM-002)
await fs.rename(tmp, stateFile);
```

If the comment can be deleted without losing information, delete it.

---

## 14. Single-Word / Magic Names

```ts
// ❌
const x = await get(s);
function process(d) { ... }
function doStuff(args) { ... }

// ✅
const status = await getStatus(state);
function checkCurrentArtifact(deps: Deps, input: CheckInput) { ... }
```

Naming is the documentation. `temp`, `tmp`, `data`, `info`, `obj`, `value` are forbidden in production code unless they are math coordinates.

---

## 15. Test as Implementation Mirror

```ts
// ❌ — testing implementation, not behavior
it("calls fs.readFile with state.json path", async () => {
  const spy = vi.spyOn(fs, "readFile");
  await getStatus(opts);
  expect(spy).toHaveBeenCalledWith(".ocoding/state.json", "utf8");
});

// ✅ — testing behavior + contract
it("returns blocked with ERR_IO_OR_CONFIG when project not initialized", async () => {
  const result = await getStatus(emptyProjectOpts);
  expect(result.status).toBe("blocked");
  expect(result.errorCode).toBe("ERR_IO_OR_CONFIG");
  expect(result.exitCode).toBe(4);
});
```

---

## 16. Adding Phase 1+ Features Inside Skeleton Spike

Per `docs/08-mvp-plan.md` §3.3, Skeleton Spike implements ONLY 5 commands. If during Skeleton Spike you find yourself writing `runGate`, `advanceState`, `captureLog`, baseline, doctor, reset, MCP server, or test record — **stop**. That is scope drift.

If the design genuinely needs an earlier feature: **write a Decision Log entry first** (`docs/19-decision-log.md`), update `docs/08-mvp-plan.md` Amendment, then proceed.

---

## 17. Renaming a Stable ID

```ts
// ❌ — renaming step_small_pr → step_pr_summary in v1.0.0 would be silent breakage
// (it ALREADY happened during SPEC; subsequent renames need explicit Decision Log + SOP minor bump)
```

Once a stable ID is published in any released SOP profile, renaming it is a breaking change requiring SOP version minor bump and `CHANGELOG.md` "breaking change" entry.

---

## 18. AI Writing Decisions or Advancing State

These are human-only actions in v1.0:
- `ocn advance` (state advancement)
- `ocn log --type decision` (formal decision capture)
- Modifying SOP profile content
- Marking a `blocked` artifact as complete

Even if AI proposes the right answer, the human runs the command.

---

## 19. Creating Files Outside the Documented Tree

The project tree in `CLAUDE.md` §7 is exhaustive for v1.0. Adding `src/utils/`, `src/helpers/`, `src/lib/` because "it feels right" is forbidden. Either it fits in `core/`, `cli/`, `mcp/`, `types/` or it requires an Amendment to `docs/04-information-architecture.md`.

---

## 20. Console Output in `src/core/`

```ts
// ❌ in any file under src/core/
console.log("loaded state");
console.error("oh no");

// ✅ — core returns CommandResult; CLI/MCP layer handles user-visible output
return ok(stateData);
```

Core Engine is presentation-free (`docs/06-api-contract.md` §2.5). Logging happens at the edges, via the typed logger.
