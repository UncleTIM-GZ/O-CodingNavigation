# Amendment AM-012 — Contract Backbone (declared-vs-wired API surface drift)

**Status**: **Proposed (not yet implemented) — v3** (revised after an adversarial Codex review).
Engine/CLI feature, **opt-in**, **NOT a SOP bump** (precedent: AM-008 Rewind, AM-009 Auto).
Supersedes nothing until accepted as DEC-037 and implemented.

## Date

2026-06-27

## 中文摘要（一段话）

OCN 现能抓四类假完成（缺章节 / 逻辑未接线 / 未就绪 / 空收据），独缺第五类：
**DESIGN 声明的 API 契约 vs 前端实际调用面的漂移**。本升级把它做成 OCN 原生的 **Contract
Backbone**：**确定性 AST 解析**（非正则）、**声明驱动**（绝不臆造端点）、**opt-in**（不开启则
行为零变化）、fail-closed 但**只在"经前缀归一后路径仍是静态字面量"的高置信调用上硬拦**——
绝不把 fail-closed 变成 false-closed。**职责分两层干净拆开**：声明块合法性在 DESIGN 步校验
（exit 2），漂移检测在 BUILD/VERIFY 跨切面门（exit 1）。不引入外部代码、不 bump SOP、不碰
MCP 7 工具、不调模型。外部软件（umadev）只作镜鉴。

## Revision history

- v1 → SOP 0.6.0 bump, regex extractor, 4 violation classes.
- v2 → engine/CLI feature (no bump), AST `.ts/.tsx`, 3 classes, dropped `unimplemented_contract`,
  added `base_path` fix; **folded block validation into the BUILD/VERIFY gate (Fix-3).**
- **v3 (this) → reverses Fix-3** (block validity belongs at the DESIGN api-contract step, per OCN's
  artifact-validator pattern); narrows `certain`; adds exit-4 IO semantics, `frontend_root` security,
  opt-in-without-block failure mode, projection determinism rules. All from the Codex review.

## Why this is an engine/CLI feature, not a SOP bump

The Logic / Readiness / Task backbones bumped the SOP minor version because each added a
**required step or a profile-shipped rulebook** to *every* project's default pipeline. AM-012 does
neither, so it follows the AM-008/AM-009 precedent — **only if** two conditions hold (called out by
the review and adopted here as hard constraints):

1. `contract.enabled: false` (default) leaves gate/check/advance/`doc create` behavior **byte-identical**.
2. The rulebook (the contract) stays **project-declared** in the DESIGN api-contract artifact, **not
   shipped inside the SOP profile** (unlike Readiness's 55 checks).

Mechanism: a new **cross-cutting drift gate** + a new **opt-in obligation** + new config, wired at the
engine level. 0.5.0 stays the runtime default; **no `src/sops/**` change, no SOP loader flip.**

## Supersedes

None. The frozen DESIGN api-contract artifact slot is **extended** with an optional machine-parseable
block, not rewritten.

## Applies to (forward-looking — files to be created/touched on implementation)

- `src/types/api-contract.ts` — zod: `ContractEndpoint` / `FrontendCall` / `ContractViolation` +
  `HttpMethod` / `CallConfidence` / `ViolationKind` enums.
- `src/core/id.ts` — new id prefix `endpoint_` (§4.1/§4.2).
- `src/core/artifact/api-contract-parser.ts` — parse + **structurally validate** the `ocn-api-contract`
  block; invoked by the **DESIGN api-contract step's artifact gate** (not BUILD/VERIFY).
- `src/core/contract/frontend-call-extractor.ts` — **read-only**, **TypeScript compiler-API (AST)**
  extraction over `.ts`/`.tsx` only; path-contained under project root; emits `FrontendCall` + `confidence`.
- `src/core/contract/contract-drift.ts` — pure cross-validation (declared × extracted → violations).
- `src/core/gate/contract-drift-gate.ts` — the cross-cutting drift gate (BUILD/VERIFY, opt-in).
- `src/core/gate/gate-runner.ts` — (a) chain block-validity into the api-contract step's artifact gate;
  (b) add a **bespoke cross-cutting branch mirroring `readinessOrNull()`** (there is no generic
  cross-cutting registry today — readiness is bespoke; AM-012 adds a sibling branch, or a small refactor
  extracting a shared cross-cutting pipeline).
- `src/core/contract/contract-graph-store.ts` + summary — deterministic `.ocoding/contract-graph.json`.
- `src/core/security/project-root.ts` — **reused** to canonicalize/contain `contract.frontend_root`.
- `src/core/obligation/*` — register `obligation_contract_backbone` (activates on opt-in).
- `src/core/templates/api-contract.ts` — add the optional `ocn-api-contract` block **rendered only when
  opted in** (keeps `ocn doc create api-contract` byte-identical for everyone else).
- config — `.ocoding/config.yaml`: `contract.enabled` (default `false`), `contract.frontend_root`,
  `contract.base_path` (optional API prefix). Traversal exclusions are built-in defaults
  (`node_modules`, `dist`, `build`, `.next`, `.svelte-kit`, generated output).
- `src/core/brief.ts`, `src/cli/render/text.ts` — coverage summary.
- `CLAUDE.md` §5 obligation table + §6 note. **MCP surface stays exactly 7 tools (§4.8).**

## Context

OCN's state machine prevents *phase* drift; Logic Backbone (AM-003) *logic* drift; Readiness Backbone
(AM-004) *unready* completion; Task Backbone (AM-007) *receipt-only* completion. One class is unguarded,
surfaced by studying an external reference (umadev) purely as a mirror:

> **Class 5 — contract drift.** DESIGN declares an API contract; BUILD writes a frontend that calls it.
> Nothing checks the two agree. A project passes every gate while the frontend calls `DELETE /api/users`
> against a contract declaring only `GET /api/users`, or calls `/api/invoices` the contract never declared.
> **Structurally complete and process-clean, yet the implementation surface diverges from the declared
> interface.**

Declaration-anchored contract conformance (Pact, OpenAPI conformance, fitness functions): make the
declared contract the single source of truth and mechanically cross-check call sites — **without inventing
either side**.

## Decision

An **opt-in, declaration-driven, AST-based Contract Backbone** with **two cleanly-separated concerns**.

### D1 — Declared source of truth (no derivation)

The DESIGN api-contract artifact gains an optional fenced block whose info string is **exactly
`ocn-api-contract`** (the body is YAML). The tag is the selector — an untagged ` ```yaml ` / ` ```json `
block is **intentionally not** picked up, so an unrelated YAML block can never be silently captured as the
contract (`src/core/artifact/api-contract-parser.ts`):

```ocn-api-contract
endpoints:
  - id: endpoint_list_users      # stable string id (§4.1)
    method: GET
    path: /api/users             # :param segments are wildcards
  - id: endpoint_delete_user
    method: DELETE
    path: /api/users/:id
```

OCN **never invents endpoints from prose.** The declared set is authoritative.

### D2 — Concern #1: block validity is checked at the DESIGN step (exit 2)

**(Reverses v2's Fix-3.)** When the api-contract artifact is checked, if the `ocn-api-contract` block is
present it is structurally validated *there*, as part of that step's artifact gate — matching how OCN
validates every artifact at its own `currentStepId` (`src/core/gate/gate-runner.ts`). Defects →
`ERR_ARTIFACT_INVALID` (exit 2): duplicate endpoint id, duplicate `(method, path)`, invalid HTTP method,
path without leading `/`.

**Opt-in-without-block failure mode (was unspecified):** if `contract.enabled: true` but the api-contract
artifact contains **no** `ocn-api-contract` block, the contract source of truth is missing — the
api-contract step's gate **fails with `ERR_ARTIFACT_INVALID` (exit 2)**, never a silent pass. Opting in is
a declaration that the block must exist.

### D3 — Concern #2: drift detection at BUILD/VERIFY (exit 1)

When opted in, a cross-cutting gate (the Readiness placement) reads `contract.frontend_root` and extracts
call sites **via the TypeScript compiler API over `.ts`/`.tsx`**, then cross-validates against the declared
endpoints. It blocks any forward move out of BUILD and out of VERIFY on high-confidence drift.

### D4 — Confidence model: the single rule that prevents false-closed

A `FrontendCall` is **`certain` only when, after `base_path` normalization, both method and path are
statically-literal**, AND the call is one of a **strict v1 allowlist**:

- literal `fetch('<path>', { method: '<verb>'? })` (no method ⇒ GET, per the fetch spec)
- `axios.<verb>('<path>', …)`
- `axios({ method: '<verb>', url: '<path>', … })` with both literal

**Everything else degrades to `inferred`** — `useQuery`/`useMutation`, wrapped/factory clients,
per-client `baseURL` instances, computed/dynamic paths, env-var-derived bases, absolute URLs / `new URL()`,
generated SDKs, path-aliased helpers. Template literals normalise per-segment (`/api/users/${id}` →
`/api/users/:param`). Path matching is structural, segment-by-segment, with `:param` wildcards.

> **The rule: only a `certain` call may BLOCK. `inferred` never blocks** (→ `unverified_call`, surfaced in
> the brief). This collapses the entire false-BLOCK surface (proxies, rewrites, factory clients, monorepo
> call shapes) into "not statically literal ⇒ inferred ⇒ warn", so **fail-closed never becomes false-closed.**

### D5 — Minimal violation taxonomy

| Kind | Meaning | Severity | Exit |
|---|---|---|---|
| `undeclared_call` | a `certain` call whose path matches **no** declared endpoint | **BLOCK** | 1 |
| `method_mismatch` | path matches a declared endpoint, method differs, call is `certain` | **BLOCK** | 1 |
| `unverified_call` | path/method only `inferred`; cannot confirm or refute | **WARN** | 0 |

`unimplemented_contract` (declared endpoint with zero callers) is **dropped from v1** (semantically weak —
a legit consumer may be non-frontend; would manufacture alert fatigue). See Non-goals.

### D6 — Exit-code precedence (explicit, per §4.6)

1. malformed declared block / opt-in-without-block → `ERR_ARTIFACT_INVALID` (**2**) — at the DESIGN step.
2. high-confidence drift (`undeclared_call` / `method_mismatch`) → `ERR_GATE_FAILED` (**1**) — at BUILD/VERIFY.
3. unreadable / out-of-root `frontend_root`, or projection-write failure → `ERR_IO_OR_CONFIG` (**4**).

### D7 — `frontend_root` security & projection determinism

- **Security:** `contract.frontend_root` is resolved through `src/core/security/project-root.ts` —
  canonicalized and **must be contained under the project root** (symlinks resolved; escapes refused with
  exit 4). Built-in traversal exclusions (`node_modules`, `dist`, `build`, `.next`, `.svelte-kit`,
  generated). Server/route-handler files are **not** counted as frontend in v1.
- **Determinism:** `.ocoding/contract-graph.json` uses canonical ordering (endpoints by `id`; calls by
  `file` then position; violations by `(kind, path, method)`), normalized path form, and call dedupe by
  `(method, normalized_path, file)` — so the machine source of truth (§4.10) is stable across runs.

### D8 — Opt-in; off ⇒ zero behavior change

`contract.enabled` defaults to `false`: the obligation never activates, neither gate runs, the template
block is not rendered, and **every command is byte-identical to 0.5.0**. Preserves the generic-OS identity.

### D9 — Relationship to auto mode (AM-009 / AM-011)

The drift gate is an **additional deterministic arbiter** inside the BUILD/VERIFY loop; it **does not
replace** AM-011's mandatory pre-trigger fresh-context expert-review subagent, and composes with AM-009's
circuit breaker (repeated contract-gate failures count toward suspension). Coverage + `unverified_call`
warnings surface in `ocn brief` and next-prompt so phase-2 automation can act before repeated failure.

## What was absorbed vs. rejected from the external reference (umadev)

Principle: **iterate on OCN natively; never fuse external software; use it only as a mirror.**

**精华 — absorbed (idea only, zero code/dependency):** Class 5 as a real false-completion category;
structural segment-by-segment `:param` matching; per-segment template-literal normalisation; honest
method/path uncertainty so guesses never hard-block.

**糟粕 — rejected (would violate §3/§4/§10):** ❌ heuristic endpoint derivation (OCN is declaration-driven);
❌ regex extraction (chose deterministic AST); ❌ fail-open governance (stay fail-closed, only narrow the
block surface to certainty); ❌ driving the model / owning the loop / building the app; ❌ vector/embeddings,
TUI, OpenAPI emission, design-slop heuristics, multi-seat LLM critic; ❌ mandatory-for-all and ❌ bumping the
SOP (kept opt-in + engine-level to protect the generic-OS identity).

## Non-goals

- Semantic/behavioral endpoint correctness (Rice-theorem limit: proves declared-vs-called *surface*
  agreement, not handler correctness).
- `.vue`/`.svelte`/`.astro` extraction in v1 (no deterministic AST — explicit gap).
- `unimplemented_contract` in v1 (weak signal).
- **Multi-root monorepos in v1** — a single `contract.frontend_root`; multi-app repos are **out of scope**
  (revisit with a root list later), stated explicitly rather than pretended-covered.
- Backend-route introspection (declared contract is the oracle).
- Intent verification (the contract itself could be wrong vs. user intent — shared blind spot of all
  artifact gates; belongs in REFLECT / uncertainty policy, not a gate).

## Impact

- Opt-in projects gain a deterministic Class-5 guard before VERIFY can complete; opt-out projects are
  unaffected (byte-identical to 0.5.0).
- One id prefix (`endpoint_`); one optional artifact block; one `.ocoding/` projection; block-validity at the
  DESIGN step + one cross-cutting drift gate; one opt-in obligation; three config keys.
- No breaking change; **no SOP version change**; no migration. **MCP surface unchanged — 7 tools (§4.8).**

## Open implementation question (flagged, not decided here)

`gate-runner.ts` has no generic cross-cutting registry — readiness is bespoke. AM-012 can either add a
second bespoke branch (smaller diff, mirrors today's shape) or extract a shared cross-cutting pipeline
(cleaner, larger diff). Decide at implementation time; this amendment does not mandate the refactor.

## References

- Engine/CLI-feature precedent: AM-008 (Rewind & Cycle), AM-009 (Auto Mode) — neither bumped the SOP.
- Sibling false-completion gates: AM-003 (Logic), AM-004 (Readiness), AM-007 (Task).
- Security posture: `src/core/security/project-root.ts`. Referee-freeze precedent: `src/core/readiness/freeze-check.ts`.
- DEC-037 (below) — promote to `docs/20-decision-log.md` on acceptance.
- External reference studied as a mirror only: umadev (`umadev-contract` crate). No code imported.

---

## DEC-037（草案｜接受后移入 docs/20-decision-log.md）｜Contract Backbone：声明驱动的契约漂移门（引擎/CLI 特性，opt-in，非 SOP bump）

Date: 2026-06-27
Implements: `docs/amendments/2026-06-27-contract-backbone-amendment.md`（AM-012，v3）

### Status

**Proposed（尚未实现）** — 升级设计稿，经一轮 Codex 对抗性审核修订至 v3；待人工确认后实现并改为 Accepted。

### Context

OCN 已堵住四类假完成，独缺第五类：DESIGN 声明的 API 契约与 BUILD 前端调用面的漂移。研究外部参考工具
（umadev）作镜鉴时确认这是真实且可确定性检测的假完成，正落在 OCN「检测假完成」本分上；参考工具的实现
路线（fail-open、散文猜端点、正则脆弱、驱动模型、向量/TUI/多席评审）一律拒绝、零代码引入。

### Decision（要点；全文见 AM-012 v3）

1. **引擎/CLI 特性，不 bump SOP**（沿 AM-008/009）：opt-in、默认零变化；契约由项目在 DESIGN 工件声明，
   不进 SOP 模板。
2. **职责两层拆开**：声明块合法性在 **DESIGN api-contract 步**校验（exit 2，符合 OCN 工件校验模式——
   修正 v2 把它折进 BUILD/VERIFY 的错误）；漂移检测在 **BUILD/VERIFY 跨切面门**（exit 1）。
3. **声明驱动 + 确定性 AST 提取**（仅 `.ts/.tsx`，TS 编译器 API；`.vue/.svelte/.astro` 与多根 monorepo
   v1 明确非目标）。
4. **唯一防 false-closed 规则**：只有"经 base_path 归一后方法与路径均为静态字面量"且属严格白名单
   （`fetch`/`axios.<verb>`/`axios({…})`）的调用算 `certain` 才硬拦；其余（包装客户端、动态路径、env base、
   全 URL、生成 SDK 等）一律降级 `inferred`，永不拦。
5. **退出码定序**：声明块错/开启却无块=2；高置信漂移=1；frontend_root 不可读或越界/投影写失败=4。
6. **安全与确定性**：frontend_root 经 `project-root.ts` 限定在仓库根内（拒越界）；`.ocoding/contract-graph.json`
   canonical 排序+去重+路径归一+遍历排除。
7. **opt-in 关则等价**（与 0.5.0 逐字一致），模板可选块仅 opt-in 时渲染；**MCP 仍 7 工具不变**；不取代
   AM-011 触发前评审，叠加 AM-009 熔断器。

### Consequences

opt-in 项目在 VERIFY 完成前多一道第五类（契约漂移）确定性把关，opt-out 项目零影响；以"声明驱动 + AST +
唯一 certain 规则"换无误杀硬拦，以"opt-in + 不 bump SOP + 单根 v1"守通用身份与最小范围。代价是开启项目需
声明契约块、配前端根与可选前缀；裁决权边界（gate 为准、不调模型、人类授权推进）一概不变。
