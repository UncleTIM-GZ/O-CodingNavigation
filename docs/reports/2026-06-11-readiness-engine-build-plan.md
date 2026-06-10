# Readiness 引擎实现计划（P0–P2）

## Context

AM-004（`docs/amendments/2026-06-11-readiness-backbone-amendment.md`）+ DEC-028 已定案：OCN 新增 **readiness 横切门禁**——由规则手册 `docs/readiness-backbone.yaml`（v0.4.0，55 条 / 48 block / 7 warn，R1–R4 铁律）驱动，开世界判定（FAIL 和 UNKNOWN 都拦），随 SOP 0.4.0 发布。引擎尚不存在，本计划实现它。

**用户已锁定的决策**：
1. **Tier 词汇**：引擎内建映射 `minimal→solo、production→team、full→platform`（不改既有 `Tier` 枚举，零破坏）。
2. **范围**：P0–P2 核心先行。AC→测试溯源（P3 spike）、waive 豁免（P4）、hash 冻结（P5）列入后续，本次**不做**——对应的派生谓词诚实返回 UNKNOWN。
3. **默认版本**：0.4.0 注册可加载，`DEFAULT_SOP_PROFILE_VERSION` **保持 0.3.0**；切默认另起 DEC。

**执行第一步（落档）**：把本计划写入 `docs/reports/2026-06-11-readiness-engine-build-plan.md`（该目录已有先例，DEC-022 引用过 reports/）。

## 同构先例（照抄对象）

logic-backbone 三件套即模板，全部已验证：
- Parser：`src/core/artifact/logic-backbone-parser.ts`（`extractFencedBlocks` + tag 定位 + yaml.load + zod strict）
- Validator/Gate：`src/core/gate/logic-backbone-validator.ts` / `logic-backbone-gate.ts`（结构化 issue → `describeIssue()` 双语 → `BilingualMessage`）
- Store：`src/core/logic/logic-graph-store.ts`（temp+rename 原子写 `.ocoding/*.json`，读失败返 null）
- 接线：`src/core/gate/gate-runner.ts:214-259`（section gate 后链式追加）；`src/core/check.ts:114-296`（check 是独立代码路径，需各自接线）
- 错误码：`src/types/result.ts`（`ERR_GATE_FAILED`=exit 1，按 AM-004 决策 3）
- CLI 注册：照 `src/cli/commands/doc.ts` 子命令模式；输出走 `outputResult`（`src/cli/output.ts`）
- 审计：`createAuditEvent` + `safeAudit`（`src/core/audit/`）

**已知事实**：SOP profile 是 TS 模块（`src/sops/default-ai-coding-sop/<ver>/{data,render,sop,gates,artifacts,config}.ts`），loader 注册表在 `src/core/sop/loader.ts:76-111`；`Tier` 枚举在 `src/types/state.ts:3`；obligations 机制**代码中不存在**（README 提及但未实现）——本次不发明 obligation 框架，readiness 直接作为 gate 接线即达到同等效果；无 glob 库（自实现 `*` 通配→regex，pattern 都是简单 `*foo*`）；子进程用 `execFile`（先例 `src/core/execution-navigator/github-pr-runner.ts`）。

---

## P0 — 手册内置 + sop lint（先于一切）

**新文件**
- `src/types/readiness.ts` — zod 单一源头：`ReadinessRulebook`（artifact_aliases / repo_probes / checks[]）、`ReadinessRule`（id/role/layer/concern/tier_required/requires/severity/scenario/check/fix_hint/waivable/anchor）、`Verdict` 枚举 `PASS|FAIL|UNKNOWN|WAIVED|NA`、`TIER_MAP`（minimal→solo 等）。照 `src/types/logic-backbone.ts` 风格，`.strict()`。
- `src/sops/default-ai-coding-sop/0.4.0/` — 复制 0.3.0 六件，版本号改 0.4.0；**新增 `readiness.ts`** 导出规则手册 YAML 字符串（内容源自 `docs/readiness-backbone.yaml` v0.4.0）。
- `src/core/readiness/rulebook-loader.ts` — YAML 字符串 → zod 校验 → `ReadinessRulebook`。
- `src/core/readiness/rulebook-lint.ts` — 元校验器：每条 check 字段 ⊆ requires 声明字段（repo.* 与派生谓词白名单除外）；alias 引用可解析；谓词名合法；`waivable:false` 与 fix_hint 含 "WAIVED" 互斥；每条恰一个 role。（这正是抓出 19 个漂移 bug 的那套检查的产品化）

**修改**
- `src/core/sop/loader.ts` — PROFILE_SOURCES 注册 0.4.0（含 `readinessYaml?` 可选字段，0.1–0.3 无）；`SopProfileVersion` 联合类型加 `"0.4.0"`；**DEFAULT 保持 0.3.0**。
- `src/core/init.ts` — profile 含 readiness 手册时快照到 `.ocoding/readiness-rules.yaml`（与 sop/gates/artifacts 快照同列）。
- `src/cli/commands/init.ts` — 加 `--sop-version <v>` 选项（走 `loadSopProfileByVersion`），让 dogfood 能显式 init 0.4.0 项目而不动默认。

**测试（unit）**：rulebook-loader 解析内置手册成功；rulebook-lint 对内置手册零 finding（dogfood，照 `tests/unit/logic-backbone-shipped.test.ts` 模式）+ 对构造的坏手册（字段漂移/非法谓词/WAIVED 矛盾）逐类报错。

## P1 — 探针 + 评估器 + store + CLI + 接线

**新文件（均 ≤300 行，超则拆）**
- `src/core/readiness/artifact-resolver.ts` — 按 artifact_aliases 的 glob 在 `docs/` 下解析 slug→实际文档路径（自实现 `*`→`.*` regex；按声明顺序取第一个命中）。
- `src/core/readiness/repo-prober.ts` — path 探针（glob 命中且**非空**，R4）；command 探针（`execFile`，命令取自 `.ocoding/config.yaml` 新 `commands.build/test` 字段；未配置 → UNKNOWN(missing=command)）。
- `src/core/readiness/predicate-eval.ts` — `not_empty | exists | true | numeric_with_unit（regex 拒 TBD/可控）| count_gte:N | enum_in`。派生谓词（`each_acceptance_scenario_has_test_ref`、`ci_runs_tests`、`gated_advance`、`process_events_vs_tier_ceiling`）本次一律返回 `UNKNOWN(missing=engine_capability)` 并在 detail 注明属 P3+。
- `src/core/readiness/evaluator.ts` — 编排：读 config tier → TIER_MAP → 过滤（不在 tier_required → NA）→ 逐条解析 requires（artifact 字段值来自 P2 嵌入块；缺文档/缺块/缺字段 → UNKNOWN(missing=…)）→ 谓词求值 → verdict ledger。
- `src/core/readiness/readiness-store.ts` — `.ocoding/readiness.json` 原子读写（照 logic-graph-store）。
- `src/core/gate/readiness-gate.ts` — gate 包装：block 级 tier 必需项 ∉ {PASS} 即 blocked（WAIVED 本次不存在）；汇出 BilingualMessage + 每条 blocking 项的 `fix_hint`（按 locale）。
- `src/cli/commands/readiness.ts` — `ocn readiness list [--json]`：渲染全表（PASS/FAIL/UNKNOWN/NA + warn 单列 + fix_hint）。`waive` 子命令 P4 再加。

**修改**
- `src/core/gate/gate-runner.ts` — section（+logic）gate 通过后：profile 有 readiness 手册 → 跑 readiness gate；blocked → `ERR_GATE_FAILED`(exit 1) + 审计 `artifact_gate_blocked`；通过/评估完成 → 持久化 `readiness.json`。
- `src/core/check.ts` — 同样接线（check 与 gate 是两条路径，都要接）。
- `src/core/brief.ts` + `src/cli/render/text.ts` — brief 读 readiness.json，新增 `readinessSummary`（计数 + 未过项 fix_hint 清单 + warn 项）；`appendReadinessBlock()` 渲染。
- `src/cli/index.ts` — 注册 readiness 命令。
- `src/types/audit.ts` — 若需新事件类型（如 `readiness_gate_run`），加进 `AuditEventType` 枚举；否则复用 artifact_gate_* 系列（优先复用）。
- MCP：`navigator.run_gate` 经 `runGate` 自动覆盖 readiness（只读评估），无需新工具。

**测试**：unit（resolver 对重编号项目解析、prober 空文件拒绝、谓词表逐个、evaluator 的 tier 过滤+UNKNOWN 语义、store 往返、gate blocked/pass 双路）；cli（`tests/cli/readiness.test.ts`：temp 项目 `spawnOcn` init 0.4.0 → readiness list → gate 拦截 → 补齐后放行；0.3.0 项目完全不受影响）。

## P2 — 文档嵌入块（ocn-readiness）

**新文件**
- `src/core/artifact/readiness-block-parser.ts` — tag `ocn-readiness`，复用/抽出 `extractFencedBlocks`；zod：`{ artifact: artifact_slug, fields: record(string → string|number) }` strict。**R1 在 schema 层落地**：fields 值不允许 boolean（手册 0.4.0 修订后，块供给的谓词只有 not_empty/numeric/count/enum，true 类全是引擎派生——块里结构上写不出结论）。

**修改**
- evaluator 的 artifact 字段解析接通：resolver 找到文档 → block-parser 取字段值 → 谓词求值。
- 0.4.0 profile 的文档模板：为承载 readiness 字段的文档模板加 `ocn-readiness` 块桩（含注释说明 R1）。模板入口照 AM-003 的 `src/core/templates/` + registry 模式，路径从 active profile 取（`artifactPathForStep`），0.3.0 模板不动。代表性模板：prd（security_constraints/value_proposition）、scope（stop_conditions/in_scope/must_not_do）、test-strategy（coverage_target）、mvp-plan（phases/risks）。

**测试**：unit（block-parser 合法/非法/boolean 拒绝/多块取 tag 精确）；e2e 式 cli 用例：init 0.4.0 → doc create → 填块 → check 由 UNKNOWN→PASS 翻转。

---

## 提交策略

- 分支 `feat/readiness-engine`；按 P0/P1/P2 各一组提交（CLAUDE.md §8 单 PR ≤500 行 → 每阶段独立 PR 或至少独立 commit 序列）。
- 每次提交前必跑：`npm run lint && npm run typecheck && npm run test`（OCN §9 硬规）。
- commit 格式 `feat(readiness): …` / `test(readiness): …`。
- 不切默认版本、不发 npm、不合 PR（人工决定）。

## 验证（端到端）

1. `npm run lint && npm run typecheck && npm run test`（覆盖率阈值 70/70/60/70 不回退）。
2. **新项目 dogfood**：temp 目录 `ocn init --sop-version 0.4.0` → `ocn check` 应 blocked 并逐条打印 fix_hint（git/CI/测试探针 FAIL，文档字段 UNKNOWN）→ `git init`、补 CI 桩、填模板块 → check 逐步翻绿 → `ocn readiness list` 全表与 `.ocoding/readiness.json` 一致 → `ocn brief` 出现 readiness 摘要。
3. **回归不伤旧版**：0.3.0 项目（现有 fixture `tests/fixtures/projects/valid-minimal`）的 check/gate/advance 行为零变化。
4. **手册自校验**：shipped-rulebook lint 测试绿（= 19 类漂移永久有人拦）。

## 显式不做（本次）

- AC→测试溯源真实实现（P3 spike：pytest --collect-only / vitest list 适配器）
- `ocn readiness waive` + waive-with-probe + WAIVED 状态（P4）
- 探针命令/tier 的 hash 冻结与审计事件（P5）
- DEFAULT 切 0.4.0、npm 发布、obligation 框架
