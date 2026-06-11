# readiness-backbone（角色就绪骨架）— 提案

> Status: proposal（探索中，未冻结）· Created: 2026-06-10
> 关联：与已 ship 的 `docs/07-logic-backbone.md` 结构同构；候选下一个 amendment。
> 来源动机：dogfood 中"写完几十份工程文档后，产品总监+开发总监仍炸出一堆基础缺陷"，暴露 OCN 验证面只在 artifact 内部、对文档外现实与未覆盖角色维度结构性失明（false completion 的上一层）。

---

## 0. 问题本质（一句话）

OCN 的门禁验证的是"**文档对 SOP schema 是否自洽**"，用户会把它误读为"**项目对现实是否就绪**"。二者之差 = OCN 自己的 false completion。
且"缺什么"是**开放、对手相对、组合爆炸**的空间——靠枚举门禁永远追不完。出路是把**不可验证的"内容完备"**换成**可验证的"问责完备 / 角色就绪"**：内容维度无限，但利益相关角色有界、稳定、可复用（oprocess 已编目 54 角色）。

---

## 1. 三角色分工

| 组件 | 谁做 | 职责 | 频率 |
|---|---|---|---|
| 清单作者 | LLM × 54 角色(oprocess) | 把角色关切写成可证伪谓词 | 一次性 + 定期补 |
| 关卡引擎 | OCN 确定性检查 | 增量评估、卡缺漏 | 每次保存 / `check` |
| 规模门控 | `tier_required` | 决定本项目必需哪些角色 | init 时定 tier |

> LLM 当清单作者，不当运行时裁判 —— 不破坏 OCN 的 no-LLM-judge / local-first 约束。

---

## 2. 三件套定义

| 字段 | 作用 | 取值 |
|---|---|---|
| `tier_required` | **规模门控**——本 tier 不在列 = N/A，显式豁免不算缺漏 | `solo` / `team` / `platform` 子集 |
| `requires` | **依赖触发**——所需 `artifact.field`，全齐才评估，否则 `UNKNOWN`；同时自动得出文档生成序 | `[]` 或 `artifact_x.field` 列表 |
| `check` | **可证伪谓词**——"讨论过"过不了，只有硬条件满足才 PASS | 见谓词词表 |

**谓词词表（确定性，无 LLM）**：`not_empty` · `exists` · `numeric_with_unit`（拒绝 TBD/可控）· `enum_in:[…]` · `count_gte:N` · `xref:artifact_x.field` · `true`

判定标准：**"我们讨论了一下"能让这条通过吗？能 → 这条是废的；不能 → 才有验证力。**

---

## 3. readiness.yaml（含三件套）

```yaml
version: 0.1.0
tier: solo                      # 本项目当前 tier，控制哪些 check 生效

checks:
  - id: rdy_dev_substrate
    role: dev_director
    concern: engineering_substrate
    tier_required: [solo, team, platform]
    requires: []                # 文件系统事实，init 即可查
    severity: block
    check:
      git_initialized: true
      dependency_lockfile: exists
      ci_config: exists
      test_dir: exists
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_test_acceptance
    role: test_director
    concern: verifiable_acceptance
    tier_required: [solo, team, platform]
    requires: [artifact_acceptance.scenarios]
    severity: block
    check:
      each_scenario_has_test_ref: true
      coverage_target: numeric_with_unit
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_pm_ownership
    role: project_director
    concern: scope_ownership
    tier_required: [team, platform]
    requires: [artifact_scope.deliverables]
    severity: block
    check:
      raci_table: not_empty
      each_deliverable_has_owner: true
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_ops_operability
    role: ops_director
    concern: operational_ownership
    tier_required: [team, platform]
    requires: [artifact_architecture.runtime_components]
    severity: block
    check:
      named_owner: not_empty
      runbook_artifact: exists
      rollback_plan: exists
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_customer_adoption
    role: customer_director
    concern: adopter_and_metric
    tier_required: [team, platform]
    requires: [artifact_prd.target_users]
    severity: block
    check:
      named_adopter: not_empty
      success_metric: numeric_with_unit
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_finance_unit_cost
    role: finance_director
    concern: unit_cost
    tier_required: [platform]
    requires: [artifact_architecture.runtime_components]
    severity: block
    check:
      monthly_cost: numeric_with_unit
    fail_code: ERR_ARTIFACT_INVALID

  - id: rdy_product_proportionality
    role: product_director
    concern: process_proportionality      # 反过度准备，对称兜底
    tier_required: [solo, team, platform]
    requires: []                          # 读 .ocoding 流程指标
    severity: warn                         # 告警不阻断
    check:
      process_events_vs_tier_ceiling: within_limit
```

> `severity: block` 进闸口；`warn` 只在 `brief` 提示（如"30 文档逼近 tier 天花板"）。
> solo tier 下 `pm/ops/customer/finance` 自动 N/A，不背平台级清单。

---

## 4. 增量算法（脏传播 + 闸口兜底）

**init（一次）**
```
active   = filter(checks, by tier)               # N/A 直接豁免
ledger[c]= UNKNOWN for c in active
index    = map<artifact.field → [check_ids]>     # 由 requires 反向建立
```

**每次保存 / `ocn check`（只动受影响项）**
```
changed    = 本次改动 fields
candidates = ∪ index[f] for f in changed
for c in candidates where ledger[c] ∈ {UNKNOWN, FAIL}:
    if all(c.requires present):  ledger[c] = eval(c.check)   # PASS / FAIL
    else:                        ledger[c] = UNKNOWN(missing=…)
persist .ocoding/readiness.json                   # 幂等
```

**`ocn advance`（总兜底闸）**
```
scope = 本阶段 tier_required 的 block 级 checks
block if any(scope) not in {PASS, WAIVED}
报告区分: UNKNOWN(输入未到) ≠ FAIL(写了但证伪不过)；warn 单列
```

**效率**：每条 check 一生只在输入齐备那刻评估≈一次 → 早暴露、零返工、闸口不漏。
对比：每文档全扫 O(文档×检查)+假失败多；末尾一次发现太晚且错误累积；依赖触发增量两者皆免。

**配套**：文档按 `requires` 依赖序生成（= logic-backbone 的 execution order），让 check 尽早解锁、缺口在累积前冒出。

---

## 5. 状态机 & 产物

- 每条状态 ∈ `{UNKNOWN, PASS, FAIL, WAIVED}`，默认 **UNKNOWN（开世界：沉默 ≠ 通过）**。
- 产物 `.ocoding/readiness.json`，`ocn brief` 常驻：已签 / 未知(缺哪个输入) / 豁免 / 告警。
- 闸口报告区分 **UNKNOWN（输入未到）≠ FAIL（写了但证伪不过）**。

---

## 6. 与 logic-backbone 同构

| | logic-backbone（已 ship） | readiness-backbone（本提案） |
|---|---|---|
| 输入 | 计算/决策节点图 | 角色关切谓词表 |
| 卡什么 | dangling / cycle / orphan | 缺输入 / 证伪不过 / 未豁免 |
| 触发 | 依赖序执行 | `requires` 依赖触发 |
| 产物 | `.ocoding/logic-graph.json` | `.ocoding/readiness.json` |
| 出口码 | `ERR_ARTIFACT_INVALID` (2) | 同 |

---

## 7. 产品重定位

OCN 从"**完备性的裁判**"退位为"**问责的账本**"：卖的纪律从"流程纪律（门都过了吗）"升级为"问责纪律（该签的都签了吗、没签的都显式承认未知了吗）"。完备性只能来自系统之外，故 OCN 结构性依赖一份它不自撰的外部花名册（oprocess / 组织 RACI），而非自己再写更长的清单。

---

## 8. 落地第一步

1. 用 oprocess 54 角色把 §3 扩到全量条目（每条带齐三件套）。
2. 拿它增量回填现有 OCN 文档 → 当场分出"真缺(UNKNOWN/FAIL)"与"讨论过但证伪不了(FAIL)"。
3. 验证有用后，按 `07-logic-backbone` 模式起 `docs/amendments/` 草案，接进 `ocn check`/`advance`/`brief`。

---

## 9. 外部验证：经典最佳实践检索（3 个并行 subagent，2026-06-10）

**总判断：不是重复造轮子，但每一个设计选择都有成熟先例。** 新意只在三点组合 ——
**(1) 依赖触发的增量评估、(2) 全角色单一结构化清单、(3) 机器可执行的可证伪判据** —— 这一组合在主流方法中无完整等价物；而"多角色闸口 / 开世界默认 / tier 控规模 / 可证伪判据"这四项均有成熟先行者，应**直接借鉴而非重新论证**。

### 9.1 最接近的先行者（必读）

- **Cusick, "Architecture and Production Readiness Reviews in Practice", arXiv:1305.2402 (2013)** —— 迄今最贴合的论文：直接命名 false readiness，主张**逐角色独立签收（individual attestation）优于集体审批**以暴露 rubber-stamping，且观察到"集体评审通过、逐角色签收暴露分歧"。缺 UNKNOWN 默认与显式豁免协议——正好是 readiness-backbone 的增量。
- **Google SRE PRR**（SRE Book ch.32）与 **AWS ORR**（Well-Architected）：多角色 + 可核查清单 + 默认不放行；AWS ORR 的"事故 COE → 新 check"闭环是长期演化范式。

### 9.2 应直接借鉴（高置信度）

| 借鉴来源 | 借鉴内容 | 落到 readiness-backbone 哪里 |
|---|---|---|
| **ATAM Quality Attribute Scenario**（Kazman/Klein/Clements, CMU/SEI-2000-TR-004） | `stimulus / response / measurable value` 三元组 | `check` 谓词的标准写法模板 |
| **BDD / Gherkin Given-When-Then**（Dan North；Adzic《Specification by Example》2011） | 条目句法：Given 文档态 / When 工具跑 / Then 可观察二值结果 | `requires` + `check` 的书写规范 |
| **NASA NPR 7123.1 Appendix G** | "最大集合 + 显式裁剪"；RFAs/RIDs 须有正向关闭证明 | `tier_required` 裁剪 + 开世界默认的措辞依据 |
| **RACI 唯一 Accountable 规则**（PMBOK） | 每项有且仅一个问责人 | "每条 check 必须有且仅一个 role" |
| **Reiter, "On Closed World Data Bases" (1978)** | OWA：不可证明为真 ⇒ UNKNOWN，非 false | `UNKNOWN` 缺省的理论合法性引用 |
| **Cooper Stage-Gate** | Must-meet（knock-out）+ Should-meet（scorecard）双层 | `severity: block` / `warn` 分层 |
| **ISO/IEC/IEEE 42010** | 每个 concern 必须被某 view 覆盖 | "每角色关切必须被某 check 覆盖"的标准背书 |

### 9.3 可证伪证据（真实可核查；其余多为经验/声誉证据）

- **WHO 手术安全核查表**（Haynes et al., *NEJM* 360(5):491–499, 2009）：19 项清单，8 院 7,688 例，并发症 **11.0%→7.0%**、院内死亡 **1.5%→0.8%**（p<0.001 / p=0.003）。清单防遗漏的最硬实证。
- **反例（机器强制的必要性）**：手术清单现实中出现 "checkbox theater"——故意植入的错误仅 **54%** 被报告（BMJ 研究，PMC9469871）。→ 清单"写法正确"不能替代"执行强制"；OCN 用 `ocn check → exit 2` 的机器强制正是对执行文化缺失的工程化补偿。
- **Cortex《2024 State of Software Production Readiness》**：有持续就绪流程的组织变更失败率仅 **38%**，无正式流程的高达 **94%**；**32%** 组织无上线后就绪流程；**36%** 把"归属不明确"列为核心阻塞。直接佐证多角色 + 开世界默认的动机。
- **Specification by Example 调查**（Adzic 2020, n=514）：用实例化规格的团队 **22%** 评质量"优秀"，不用的仅 **8%**（作者自陈为相关非因果）。
- **Goodhart / Surrogation**（Strathern 1997；HBR 2019）：Wells Fargo 以 cross-sales 指标替代"客户关系"目标，导致 **350 万** 个未授权账户。→ "非空字段"类软判据必然被 gaming，这是 readiness-backbone 坚持可证伪 + 多层防御的反面论证。

### 9.4 诚实的证据缺口

- **RACI**：Wikipedia 明言无任何实证/对照研究；有效性主要靠从业者经验。
- **Stage-Gate "6.5×成功率"**：广被引用但原始页码未核实。
- **ATAM "平均发现 20–40 风险"**：来自 SEI 非正式报告，精确数字未核实。
- 多数标准（42010 / 25010 / 12207 / TRL）为规范性文件，**不附有效性实验**。
- → 含义：行业对"就绪门禁有效"的硬实证比想象薄；最可靠的两个数据点是 **WHO 清单** 与 **Cortex 2024**。readiness-backbone 的价值主张可建立在这两点 + OWA/Goodhart 的理论论证上，不要夸大引用未核实数字。

### 9.5 对设计的直接修正

1. `check` 谓词改用 **ATAM 三元组 / Gherkin** 写法（见 §2 谓词词表升级）。
2. 强约束："每条 check 有且仅一个 `role`"（借 RACI）。
3. 文档/设计理由中引用 **Reiter 1978（OWA）** 与 **Goodhart/Strathern 1997** 作为 `UNKNOWN` 默认与拒绝软判据的正式依据。
4. 长期演化采用 **AWS ORR 的 "事故 → 新 check" 闭环**。
5. 不在对外材料中使用未核实数字（Stage-Gate 6.5×、ATAM 20–40）；只用 WHO/NEJM 与 Cortex 2024。
