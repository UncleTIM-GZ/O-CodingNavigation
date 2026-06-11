// SOP 0.4.0 bundled readiness rulebook (AM-004 / DEC-028) — the role-based
// cross-cutting readiness gate's rule source. Authored offline (LLM as
// rulebook author), enforced at runtime by the deterministic readiness
// engine (no-LLM-judge invariant preserved). Canonical draft lives at
// docs/readiness-backbone.yaml; this module is the shipped snapshot.
//
// R4 (referee outside the player's write path): this rulebook ships inside
// the SOP profile — a project-local AI works on docs/, never on this file.
export const readinessYaml = `# readiness-backbone — 角色就绪骨架（A 项产物）
# 数据源: oprocess role_definitions（本地 data/oprocess.db，54 角色 / 4 层）
# 生成: 2026-06-11 · 配套提案: docs/readiness-backbone-proposal.md
#
# 用法: 写完/修改 OCN 文档后增量回填本表 → 每条 check 评估为
#       PASS / FAIL / UNKNOWN(输入未到) / WAIVED(显式豁免)。
#       缺省 UNKNOWN（开世界：沉默≠通过，依据 Reiter 1978）。
#
# tier_required 由角色 min_team_size 推导:
#   small  → [solo, team, platform]   （连单人项目都必须）
#   medium → [team, platform]
#   large  → [platform]
# 本项目 tier=solo 时，medium/large 条目自动 N/A（不算缺漏，但建议显式 WAIVED 留痕）。
#
# requires 取值两类（均与文档编号无关，靠下方映射解析 → 校准点①②）:
#   artifact_<slug>.<field>  —— 由 artifact_aliases 按文件名 glob 解析到实际文档（不绑编号）
#   repo.<fact>              —— 由 repo_probes 定义的探测规则解析（git/ci/lockfile/test/build…）
#
# check 谓词词表（确定性，无 LLM）:
#   not_empty | exists | true | numeric_with_unit(拒绝 TBD/可控)
#   count_gte:N | enum_in:[…] | xref:artifact_x.field
# 判定铁律: “我们讨论了一下”能让这条通过吗？能→废条目；不能→才有验证力。
#
# 每条字段:
#   scenario  —— Given-When-Then，给"引擎判定"用
#   check     —— 机器可证伪谓词
#   fix_hint  —— FAIL 时给"人看"的修复提示（zh/en）。ocn check 报错时打印这句，
#                ocn brief 把未过项的 fix_hint 喂给 AI 当下一步待办。
#
# ── 0.4.0 设计铁律（2026-06-11 三方研判修订：架构评审 + 红队 + 业界研究）──
# 威胁模型 = 填块者、过门者是同一个 AI（想省力，非恶意）。四条铁律：
#   R1 指针不装结论 —— 文档嵌入块（ocn-readiness）只许填指针/参数（命令、AC ID、
#      阈值、文件路径），禁止任何自评结论字段（passed/tested/verified: true 一律非法）。
#      绿灯只能由引擎重算得出。（先例: dbt schema.yml 只声明断言参数，从无结论字段）
#   R2 引擎能跑的禁止自报 —— AC→测试溯源以引擎实际收集的测试节点名为准（注释不算）；
#      覆盖率以引擎实跑结果为准。凡可执行核验的，块里自报无效。（先例: doctest/OFT）
#   R3 无现实锚的数字降 warn —— local-first 下拿不到客观真相的声明（月成本/SLA/RTO…）
#      不得用 numeric_with_unit 做 block：那会逼 AI 把诚实的 TBD 换成编造的自信数字。
#   R4 裁判不在选手写路径上 —— build/test 探针命令与 tier 在 init 时 hash 冻结进
#      .ocoding/，修改 = 审计 push 事件；本手册随 SOP profile 发布，AI 不得改。
#      绿灯绑定被验对象 content hash，对象一变即过期。（先例: dismiss stale approvals）
# 手册自校验（ocn sop lint，上线前必须）: 每条 check 字段 ⊆ requires 声明的字段；
# alias glob 可解析；谓词名合法；waivable:false 与 fix_hint 含 "WAIVED" 互斥。

version: 0.4.0          # 2026-06-11 三方研判修订：修 5 处 requires/check 漂移；无锚数字降 warn；
                        # 清除自报布尔；AC 溯源改引擎执行语义；新增 R1–R4 铁律。
                        # 0.3.0 加 fix_hint；0.2.0 加 ①slug 映射 ②探针词表 ③solo 实质门
tier: solo
source: oprocess@54roles
fail_code_default: ERR_ARTIFACT_INVALID

# ── 校准点① artifact_aliases ──────────────────────────────
# check 的 requires 引用逻辑 slug（如 artifact_mvp_plan），引擎按文件名 glob 解析到
# 实际文档，与 00/01/02… 编号无关。换项目重编号也不会假性 UNKNOWN。
# 同一 slug 可给多个候选 glob，命中任一即可；按顺序取第一个存在的文档。
artifact_aliases:
  artifact_brief:            ["*project-brief*", "*brief*"]
  artifact_scope:            ["*scope*"]
  artifact_prd:              ["*prd*", "*product-requirement*"]
  artifact_acceptance:       ["*acceptance*"]
  artifact_ia:               ["*information-architecture*"]
  artifact_tech_arch:        ["*technical-architecture*", "*architecture*"]
  artifact_data_model:       ["*data-model*"]
  artifact_api:              ["*api-contract*", "*api*"]
  artifact_test_strategy:    ["*test-strategy*"]
  artifact_logic_backbone:   ["*logic-backbone*"]
  artifact_mvp_plan:         ["*mvp-plan*", "*mvp*"]
  artifact_real_data_wiring: ["*real-data-wiring*", "*integration-landing*", "*integration*"]
  artifact_config_env:       ["*config-and-env*", "*config*", "*env*"]
  artifact_reproducibility:  ["*reproducib*", "*build-plan*"]
  artifact_rollback:         ["*rollback*"]
  artifact_validation:       ["*validation*"]
  artifact_debug:            ["*debug*", "*error-taxonomy*"]
  artifact_baseline:         ["*baseline*"]
  artifact_release_notes:    ["*release*"]
  artifact_dev_log:          ["*dev-log*"]
  artifact_observability:    ["*observability*"]
  artifact_audit_trail:      ["*audit-trail*", "*audit*"]
  artifact_evolution:        ["*evolution*"]
  artifact_ai_governance:    ["*ai-governance*", "*governance*"]
  artifact_uncertainty:      ["*uncertainty*"]
  artifact_decision_log:     ["*decision-log*"]

# ── 校准点② repo_probes ───────────────────────────────────
# repo.<fact> 的探测规则。glob 命中任一即为 exists；command 类由引擎跑命令判退出码。
# R4 约束: path 类命中文件必须非空（堵 \`touch deps.lock\` 式空壳）；command 类的
# run 命令在 ocn init 时定下并 hash 冻结进 .ocoding/，后续修改 = 审计 push 事件
# （堵"把 build cmd 配成 echo ok"——探针入口本身必须在锚的保护范围内）。
repo_probes:
  git_initialized:       { type: path,    any: [".git/"] }
  dependency_lockfile:   { type: path,    any: ["package-lock.json","pnpm-lock.yaml","yarn.lock","poetry.lock","uv.lock","requirements.lock","requirements*.txt","Cargo.lock","go.sum","Gemfile.lock","composer.lock","*.lock"] }
  ci_config:             { type: path,    any: [".github/workflows/*.yml",".github/workflows/*.yaml",".gitlab-ci.yml","azure-pipelines.yml","Jenkinsfile",".circleci/config.yml"] }
  test_dir:              { type: path,    any: ["tests/","test/","__tests__/","spec/"] }
  license_file:          { type: path,    any: ["LICENSE","LICENSE.*","LICENCE*","COPYING*"] }
  readme:                { type: path,    any: ["README*","docs/README*"] }
  dev_scripts:           { type: path,    any: ["scripts/","Makefile","justfile","tasks.py","noxfile.py","package.json#scripts"] }
  build_passes:          { type: command, run: "<project build cmd>", expect_exit: 0 }
  test_command_passes:   { type: command, run: "<project test cmd>",  expect_exit: 0 }

checks:

  # ============ STRATEGY（战略层 10）============

  - id: rdy_cio_cto
    role: cio_cto
    layer: strategy
    concern: strategic_alignment          # IT战略/投资方向/业务对齐
    tier_required: [solo, team, platform]
    requires: [artifact_brief.problem_statement, artifact_scope.stop_conditions]
    severity: block
    scenario: "Given 00-brief 与 01-scope When ocn check Then 问题定义非空且至少 1 条可量化的 alpha/beta/GA 停止条件"
    check:
      problem_statement: not_empty
      stop_conditions: count_gte:1
    fix_hint:
      zh: "在 brief 写清问题定义；在 scope 加至少 1 条可量化停止条件（如 GA=通过率≥95%）"
      en: "State the problem in the brief; add ≥1 measurable stop condition to scope (e.g. GA = pass rate ≥95%)"

  - id: rdy_ciso
    role: ciso
    layer: strategy
    concern: security_policy_baseline      # 安全策略/风险治理
    tier_required: [solo, team, platform]
    requires: [artifact_prd.security_constraints]   # 0.4.0 修漂移: 原误指 .requirements，与 check 字段脱节
    severity: block
    scenario: "Given 02-prd When ocn check Then 至少 1 条显式安全/风险约束（禁明文密钥/输入校验等），非泛泛而谈"
    check:
      security_constraints: count_gte:1
    fix_hint:
      zh: "在 prd 加至少 1 条显式安全约束（禁明文密钥 / 输入校验 / 权限规则）"
      en: "Add ≥1 explicit security constraint to the PRD (no plaintext secrets / input validation / permission rules)"

  - id: rdy_brm
    role: brm
    layer: strategy
    concern: business_value_articulated    # IT与业务接口/价值传递
    tier_required: [team, platform]
    requires: [artifact_prd.value_proposition]
    severity: block
    scenario: "Given 02-prd When ocn check Then value_proposition 非空且说明'为谁解决什么'"
    check:
      value_proposition: not_empty
    fix_hint:
      zh: "在 prd 写清价值主张：为谁、解决什么问题"
      en: "Write a value proposition in the PRD: for whom, solving what"

  - id: rdy_enterprise_architect
    role: enterprise_architect
    layer: strategy
    concern: architecture_blueprint        # 企业级架构蓝图
    tier_required: [team, platform]
    requires: [artifact_ia.object_map]
    severity: block
    scenario: "Given 04-IA When ocn check Then 对象图/object_map 非空"
    check:
      object_map: not_empty
    fix_hint:
      zh: "在信息架构文档补对象图/object map（核心对象及其关系）"
      en: "Add an object map (core objects and relations) to the information-architecture doc"

  - id: rdy_pmo_director
    role: pmo_director
    layer: strategy
    concern: portfolio_priority_budget     # 组合/优先级/资源/预算
    tier_required: [team, platform]
    requires: [artifact_mvp_plan.phases]
    severity: block
    scenario: "Given 08-mvp-plan When ocn check Then 至少 1 个分阶段计划且有优先级排序"
    check:
      phases: count_gte:1
    fix_hint:
      zh: "在 mvp-plan 列出带优先级的分阶段计划"
      en: "List prioritized phases in the mvp-plan"

  - id: rdy_pmo_proportionality
    role: pmo_director
    layer: strategy
    concern: process_proportionality       # 反过度准备（对称兜底）
    tier_required: [solo, team, platform]
    requires: []                           # 读 .ocoding 流程指标
    severity: warn
    scenario: "Given 当前 tier When ocn brief Then 文档数/重写事件数未逼近 tier 天花板，否则告警'准备过头'"
    check:
      process_events_vs_tier_ceiling: within_limit
    fix_hint:
      zh: "文档/重写数已逼近 tier 上限——停止扩文档，转去写代码与测试"
      en: "Docs/rewrites near the tier ceiling — stop expanding docs, move to code and tests"

  - id: rdy_quality_manager
    role: quality_manager
    layer: strategy
    concern: quality_gates_defined         # 过程/交付质量体系
    tier_required: [team, platform]
    requires: [artifact_test_strategy.coverage_target]
    severity: block
    scenario: "Given 07-test-strategy When ocn check Then 覆盖率目标是带单位的数字（如 ≥80%），拒绝'充分覆盖'"
    check:
      coverage_target: numeric_with_unit
    fix_hint:
      zh: "在 test-strategy 写带单位的覆盖率目标（如 行覆盖 ≥80%）"
      en: "Set a numeric coverage target in test-strategy (e.g. line coverage ≥80%)"

  - id: rdy_vendor_manager
    role: vendor_manager
    layer: strategy
    concern: dependency_supplier_governance # 外包/供应商/合同 → 依赖与许可证治理
    tier_required: [team, platform]
    requires: [repo.dependency_lockfile, repo.license_file]
    severity: block
    scenario: "Given 仓库 When ocn check Then 依赖锁文件存在且 LICENSE 存在（第三方依赖可追溯）"
    check:
      dependency_lockfile: exists
      license_file: exists
    fix_hint:
      zh: "提交依赖锁文件（如 requirements.lock）并添加 LICENSE 文件"
      en: "Commit a dependency lockfile (e.g. requirements.lock) and add a LICENSE file"

  - id: rdy_compliance_manager
    role: compliance_manager
    layer: strategy
    concern: compliance_privacy            # 合规/隐私/监管
    tier_required: [platform]
    requires: [artifact_ai_governance.data_handling_statement]
    severity: block
    scenario: "Given 23-ai-governance When ocn check Then 数据处理/隐私声明非空，或显式 WAIVED（无个人数据）"
    check:
      data_handling_statement: not_empty
    fix_hint:
      zh: "在 ai-governance 写数据处理/隐私声明；若无个人数据则显式 WAIVED"
      en: "Add a data-handling/privacy statement to ai-governance; if no personal data, mark WAIVED"

  - id: rdy_it_auditor
    role: it_auditor
    layer: strategy
    concern: audit_trail                   # IT控制/审计追踪/整改闭环
    tier_required: [platform]
    requires: [artifact_audit_trail.audit_events]
    severity: block
    scenario: "Given 21-audit-trail When ocn check Then 审计事件链存在（push 事件自动留痕），xref obligation_audit_trail"
    check:
      audit_events: count_gte:1
    fix_hint:
      zh: "确保 push 类操作写入审计链（运行 ocn advance/gate 会自动产生）"
      en: "Ensure push actions write to the audit trail (ocn advance/gate produces it automatically)"

  - id: rdy_it_finance_analyst
    role: it_finance_analyst
    layer: strategy
    concern: unit_cost                     # 预算/成本核算/效益
    tier_required: [platform]
    requires: [artifact_config_env.monthly_cost]   # 0.4.0 修漂移: 原误指 artifact_api.runtime_components，与 check 字段脱节
    severity: warn          # 0.4.0 R3 降级: local-first 无账单 API，月成本无现实锚——block 只会逼 AI 编数
    scenario: "Given 10-config-and-env When ocn brief Then 月度运行成本有带单位估算，标注 estimated/measured"
    check:
      monthly_cost: numeric_with_unit
    fix_hint:
      zh: "估算月度运行成本，写成带单位数字并标注口径（如 ¥X/月 estimated）"
      en: "Estimate monthly running cost with unit and basis (e.g. $X/month estimated)"

  # ============ ARCHITECTURE（架构层 8）============

  - id: rdy_ba
    role: ba
    layer: architecture
    concern: requirements_captured         # 需求调研/流程/业务规则
    tier_required: [solo, team, platform]
    requires: [artifact_prd.requirements]
    severity: block
    scenario: "Given 02-prd When ocn check Then 至少 1 条结构化需求"
    check:
      requirements: count_gte:1
    fix_hint:
      zh: "在 prd 写至少 1 条结构化需求"
      en: "Add ≥1 structured requirement to the PRD"

  - id: rdy_product_manager
    role: product_manager
    layer: architecture
    concern: scope_boundary                # 产品路线/优先级/范围
    tier_required: [team, platform]
    requires: [artifact_scope.in_scope, artifact_scope.must_not_do]
    severity: block
    scenario: "Given 01-scope When ocn check Then in_scope 与 must_not_do（不做清单）均非空"
    check:
      in_scope: not_empty
      must_not_do: not_empty
    fix_hint:
      zh: "在 scope 同时写清 in-scope 与 must-not-do（不做清单）"
      en: "Fill both in-scope and must-not-do (the not-doing list) in scope"

  - id: rdy_solution_architect
    role: solution_architect
    layer: architecture
    concern: solution_boundary             # 方案/系统边界/集成
    tier_required: [team, platform]
    requires: [artifact_api.system_boundary]
    severity: block
    scenario: "Given 06-api-contract When ocn check Then 系统边界与对外契约非空"
    check:
      system_boundary: not_empty
    fix_hint:
      zh: "在 api-contract 写系统边界与对外契约"
      en: "Define system boundary and external contract in api-contract"

  - id: rdy_system_architect
    role: system_architect
    layer: architecture
    concern: nonfunctional_and_techstack   # 模块拆分/技术选型/非功能
    tier_required: [team, platform]
    requires: [artifact_api.tech_stack, artifact_api.nfr]
    severity: block
    scenario: "Given 设计文档 When ocn check Then 技术栈已锁定且至少 1 条非功能需求(NFR)"
    check:
      tech_stack: not_empty
      nfr: count_gte:1
    fix_hint:
      zh: "锁定技术栈并写至少 1 条非功能需求（NFR）"
      en: "Lock the tech stack and add ≥1 non-functional requirement (NFR)"

  - id: rdy_ux_ui_designer
    role: ux_ui_designer
    layer: architecture
    concern: interaction_flows             # 用户体验/界面/交互（CLI 即命令体验）
    tier_required: [team, platform]
    requires: [artifact_ia.flows]
    severity: block
    scenario: "Given 04-IA When ocn check Then 至少 1 条端到端用户/命令流程，含错误态处理"
    check:
      flows: count_gte:1
    fix_hint:
      zh: "在信息架构写至少 1 条端到端流程（含错误态/异常分支）"
      en: "Add ≥1 end-to-end flow incl. error states to information-architecture"

  - id: rdy_data_architect
    role: data_architect
    layer: architecture
    concern: data_model                    # 数据模型/主数据/标准
    tier_required: [platform]
    requires: [artifact_data_model.schema, artifact_data_model.stable_ids]
    severity: block
    scenario: "Given 05-data-model When ocn check Then schema 非空且稳定 ID 约定已定义"
    check:
      schema: not_empty
      stable_ids: not_empty
    fix_hint:
      zh: "在 data-model 写 schema 与稳定 ID 约定"
      en: "Define schema and stable-ID convention in data-model"

  - id: rdy_integration_architect
    role: integration_architect
    layer: architecture
    concern: integration_contract          # 接口/消息/中间件
    tier_required: [platform]
    requires: [artifact_api.contracts]
    severity: block
    scenario: "Given 06-api-contract When ocn check Then 至少 1 份对接契约（CLI/Core/MCP）含出口码语义"
    check:
      contracts: count_gte:1
    fix_hint:
      zh: "在 api-contract 写至少 1 份对接契约（含出口码语义）"
      en: "Define ≥1 integration contract with exit-code semantics in api-contract"

  - id: rdy_security_architect
    role: security_architect
    layer: architecture
    concern: security_architecture         # 安全架构/控制点/标准
    tier_required: [platform]
    requires: [artifact_ai_governance.security_controls]
    severity: block
    scenario: "Given 安全设计 When ocn check Then 至少 1 个显式控制点（如 state 写入 lock+backup+atomic）"
    check:
      security_controls: count_gte:1
    fix_hint:
      zh: "写至少 1 个显式安全控制点（如 state 写入 lock+backup+atomic）"
      en: "Document ≥1 explicit security control (e.g. lock+backup+atomic state writes)"

  # ============ DELIVERY（交付层 15）============

  - id: rdy_developer
    role: developer
    layer: delivery
    concern: code_exists_and_builds        # 开发/编码/单测/缺陷
    tier_required: [solo, team, platform]
    requires: [repo.git_initialized, repo.build_passes]
    severity: block
    scenario: "Given 仓库 When ocn check Then git 已初始化且构建命令通过（绿）"
    check:
      git_initialized: true
      build_passes: true
    fix_hint:
      zh: "运行 git init，并确保构建命令通过"
      en: "Run git init and make the build command pass"

  - id: rdy_devops_engineer
    role: devops_engineer
    layer: delivery
    concern: ci_pipeline                    # CI/CD/环境自动化
    tier_required: [solo, team, platform]
    requires: [repo.ci_config]
    severity: block
    scenario: "Given 仓库 When ocn check Then CI 配置文件存在（lint+typecheck+test 流水线）"
    check:
      ci_config: exists
    fix_hint:
      zh: "添加 CI 配置（.github/workflows）跑 lint+typecheck+test"
      en: "Add a CI config (.github/workflows) running lint+typecheck+test"

  - id: rdy_it_pm
    role: it_pm
    layer: delivery
    concern: plan_and_risk                  # 计划/范围/进度/风险
    tier_required: [solo, team, platform]
    requires: [artifact_mvp_plan.phases, artifact_mvp_plan.risks]
    severity: block
    scenario: "Given 08-mvp-plan When ocn check Then 有阶段计划且至少 1 条已识别风险"
    check:
      phases: count_gte:1
      risks: count_gte:1
    fix_hint:
      zh: "在 mvp-plan 写阶段计划，并至少列 1 条已识别风险"
      en: "Add phases and ≥1 identified risk to the mvp-plan"

  - id: rdy_qa_engineer
    role: qa_engineer
    layer: delivery
    concern: tests_exist_pass_and_trace     # 测试设计/执行/缺陷验证（含 solo 实质门）
    tier_required: [solo, team, platform]
    requires: [repo.test_dir, repo.test_command_passes, artifact_acceptance.scenarios]
    severity: block
    scenario: "Given 仓库+acceptance When ocn check Then 测试目录存在、测试通过，且每条 AC 场景 ID 出现在引擎实际收集的测试节点名中（堵 1052 行+2 smoke 的空心绿）"
    check:
      test_dir: exists
      test_command_passes: true
      each_acceptance_scenario_has_test_ref: true   # 校准点③ + 0.4.0 R2: 引擎以 pytest --collect-only /
                                                    # vitest list 收集的测试节点名匹配场景 ID——注释不算
                                                    # （注释可被一行 \`# AC-F01 AC-F02…\` 伪造，红队 G1）
    waivable: false                                  # 此门不可豁免（solo 防空心绿的核心）
    fix_hint:
      zh: "为每条 AC 场景写测试，测试函数名含场景 ID（如 test_AC_F01_*）——注释引用不算数；此门不可豁免"
      en: "Write a test per AC scenario with the scenario ID in the test function name (e.g. test_AC_F01_*) — comment refs don't count; this gate is not waivable"

  - id: rdy_backend_engineer
    role: backend_engineer
    layer: delivery
    concern: core_logic_traced              # 服务端逻辑/接口/业务规则
    tier_required: [team, platform]
    requires: [artifact_acceptance.scenarios]
    severity: block
    scenario: "Given 03-acceptance When ocn check Then 每条 AC 场景都能 xref 到实现或测试（R2: 以引擎收集的测试节点名/符号索引为准，注释不算）"
    check:
      each_scenario_has_impl_or_test_ref: true
    fix_hint:
      zh: "让每条 AC 场景都能 xref 到对应实现或测试"
      en: "Make each AC scenario traceable to its implementation or test"

  - id: rdy_data_engineer
    role: data_engineer
    layer: delivery
    concern: data_pipeline_wiring           # 数据采集/清洗/管道
    tier_required: [team, platform]
    requires: [artifact_real_data_wiring.data_sources]
    severity: block
    scenario: "Given 09-real-data-wiring When ocn check Then 真实数据源接线非空，或显式 WAIVED（无外部数据）"
    check:
      data_sources: not_empty
    fix_hint:
      zh: "在 real-data-wiring 写真实数据源接线；无外部数据则显式 WAIVED"
      en: "List real data sources in real-data-wiring; if no external data, mark WAIVED"

  - id: rdy_dba
    role: dba
    layer: delivery
    concern: persistence_safety             # 部署/调优/备份恢复/权限
    tier_required: [team, platform]
    requires: [artifact_data_model.backup_or_atomic_write]   # 0.4.0 修漂移: 原误指 .mutation_matrix，与 check 字段脱节
    severity: block
    scenario: "Given 05-data-model When ocn check Then 关键文件写入有备份/原子语义说明（OCN: lock+bak+rename）"
    check:
      backup_or_atomic_write: not_empty
    fix_hint:
      zh: "在 data-model 写关键写入的备份/原子语义（如 lock+bak+rename）"
      en: "Document backup/atomic-write semantics for critical writes in data-model (e.g. lock+bak+rename)"

  - id: rdy_frontend_engineer
    role: frontend_engineer
    layer: delivery
    concern: presentation_layer             # 前端/交互/性能（CLI: 渲染层）
    tier_required: [team, platform]
    requires: [artifact_api.render_layer]
    severity: block
    scenario: "Given 表现层设计 When ocn check Then 渲染/输出层（text+--json）已定义，或显式 WAIVED"
    check:
      render_layer: not_empty
    fix_hint:
      zh: "定义输出/渲染层（text + --json）；纯后端无界面则显式 WAIVED"
      en: "Define the output/render layer (text + --json); if backend-only, mark WAIVED"

  - id: rdy_release_manager
    role: release_manager
    layer: delivery
    concern: release_process                # 发布计划/窗口/上线协调
    tier_required: [team, platform]
    requires: [artifact_release_notes.version, artifact_release_notes.release_notes]   # 0.4.0 修漂移: 补 release_notes 字段声明
    severity: block
    scenario: "Given 16-release-notes When ocn check Then 版本号已定义且发布说明非空"
    check:
      version: not_empty
      release_notes: not_empty
    fix_hint:
      zh: "定义版本号并写发布说明（release notes）"
      en: "Define a version and write release notes"

  - id: rdy_scrum_master
    role: scrum_master
    layer: delivery
    concern: dev_cadence                    # 敏捷节奏/障碍/协同
    tier_required: [team, platform]
    requires: [artifact_dev_log.dev_log_entries]
    severity: warn
    scenario: "Given 18-dev-log When ocn brief Then 开发日志有记录（节奏可见），否则提示"
    check:
      dev_log_entries: count_gte:1
    fix_hint:
      zh: "记录开发日志，让开发节奏可见"
      en: "Keep a dev log so the cadence is visible"

  - id: rdy_config_manager
    role: config_manager
    layer: delivery
    concern: config_baseline                # 配置基线/版本配置
    tier_required: [platform]
    requires: [artifact_config_env.config_keys]
    severity: block
    scenario: "Given 10-config-and-env When ocn check Then 配置项与基线非空"
    check:
      config_keys: not_empty
    fix_hint:
      zh: "在 config-and-env 列出配置项与基线"
      en: "List config keys and baseline in config-and-env"

  - id: rdy_mobile_engineer
    role: mobile_engineer
    layer: delivery
    concern: mobile_target                  # 移动开发/终端适配
    tier_required: [platform]
    requires: [artifact_scope.mobile_target]
    severity: block
    scenario: "Given 01-scope When ocn check Then 移动端目标已声明，或显式 WAIVED（非移动项目）"
    check:
      mobile_target: not_empty
    fix_hint:
      zh: "声明移动端目标平台；非移动项目则显式 WAIVED"
      en: "Declare the mobile target platform; if not a mobile project, mark WAIVED"

  - id: rdy_performance_engineer
    role: performance_engineer
    layer: delivery
    concern: performance_validated          # 性能测试/瓶颈/容量验证
    tier_required: [platform]
    requires: [artifact_validation.perf_targets]
    severity: block
    scenario: "Given 13-validation When ocn check Then 性能目标是带单位数字（如 p95<200ms）"   # 0.4.0 修漂移: 删"并有验证结果"（check 未判定该项；实测核验属 VERIFY 期锚单）
    check:
      perf_targets: numeric_with_unit
    anchor: verify_xref     # R1: 此声明值须在 VERIFY 期被实测 xref，声明首过门即 hash 冻结
    fix_hint:
      zh: "写带单位的性能目标（如 p95<200ms）并附验证结果"
      en: "Set numeric perf targets (e.g. p95<200ms) with validation results"

  - id: rdy_platform_engineer
    role: platform_engineer
    layer: delivery
    concern: engineering_tooling            # 平台标准化/自助/工程效率
    tier_required: [platform]
    requires: [repo.dev_scripts]
    severity: block
    scenario: "Given 仓库 When ocn check Then 工程脚本/自助工具存在（构建/发布/检查脚本）"
    check:
      dev_scripts: exists
    fix_hint:
      zh: "提供工程脚本（构建/发布/检查，如 Makefile 或 scripts/）"
      en: "Provide engineering scripts (build/release/check, e.g. Makefile or scripts/)"

  - id: rdy_test_automation_engineer
    role: test_automation_engineer
    layer: delivery
    concern: automated_regression           # 自动化框架/回归流水线
    tier_required: [platform]
    requires: [repo.ci_config, repo.test_dir]
    severity: block
    scenario: "Given CI When ocn check Then CI 配置中含测试执行步骤（v1 降级语义：解析 workflow 找测试命令；'实际跑过且绿'超出 local-first 能力，不承诺）"
    check:
      ci_runs_tests: true
    fix_hint:
      zh: "让 CI 实际运行自动化测试套件（回归门），而非只装依赖"
      en: "Make CI actually run the automated test suite (regression gate), not just install deps"

  # ============ OPERATIONS（运营层 21）============

  - id: rdy_service_desk_analyst
    role: service_desk_analyst
    layer: operations
    concern: support_entrypoint             # 一线支持/工单/响应
    tier_required: [solo, team, platform]
    requires: [repo.readme]
    severity: block
    scenario: "Given README When ocn check Then 有反馈/报错入口（issues 链接或联系方式）"
    check:
      support_channel: not_empty
    fix_hint:
      zh: "在 README 加反馈入口（issues 链接或联系方式）"
      en: "Add a feedback entry to the README (issues link or contact)"

  - id: rdy_change_manager
    role: change_manager
    layer: operations
    concern: change_control                 # 变更评审/风险/治理
    tier_required: [team, platform]
    requires: [artifact_audit_trail.events]
    severity: block
    scenario: "Given OCN advance+audit When ocn check Then 状态推进经过门禁且留痕（变更可追溯）"
    check:
      gated_advance: true
    fix_hint:
      zh: "用 ocn advance（过门禁+留痕）推进状态，勿手改 state.json"
      en: "Advance state via ocn advance (gated + audited), never hand-edit state.json"

  - id: rdy_cloud_engineer
    role: cloud_engineer
    layer: operations
    concern: cloud_infra                    # 云资源/账号/网络
    tier_required: [team, platform]
    requires: [artifact_config_env.deploy_target]
    severity: block
    scenario: "Given 10-config-and-env When ocn check Then 部署目标/环境已声明，或显式 WAIVED（本地工具）"
    check:
      deploy_target: not_empty
    fix_hint:
      zh: "声明部署目标/环境；纯本地工具则显式 WAIVED"
      en: "Declare deploy target/env; if local-only tool, mark WAIVED"

  - id: rdy_config_asset_manager
    role: config_asset_manager
    layer: operations
    concern: asset_inventory                # CMDB/资产台账/盘点
    tier_required: [team, platform]
    requires: [repo.dependency_lockfile]
    severity: block
    scenario: "Given 仓库 When ocn check Then 依赖/资产清单存在且可盘点（lockfile）"
    check:
      dependency_lockfile: exists
    fix_hint:
      zh: "提交依赖锁文件作为可盘点的资产台账"
      en: "Commit a dependency lockfile as the auditable asset inventory"

  - id: rdy_end_user_computing
    role: end_user_computing
    layer: operations
    concern: install_instructions           # 终端/桌面/客户端支持 → 安装指引
    tier_required: [team, platform]
    requires: [artifact_reproducibility.install_steps]
    severity: block
    scenario: "Given 11-reproducibility When ocn check Then 安装/运行步骤可复现非空"
    check:
      install_steps: not_empty
    fix_hint:
      zh: "在 reproducibility 写可复现的安装/运行步骤"
      en: "Write reproducible install/run steps in reproducibility"

  - id: rdy_incident_manager
    role: incident_manager
    layer: operations
    concern: incident_process               # 重大事件响应/升级/恢复
    tier_required: [team, platform]
    requires: [artifact_observability.runbook]
    severity: block
    scenario: "Given 20-observability When ocn check Then 事件响应/runbook 存在，或显式 WAIVED"
    check:
      runbook: exists
    fix_hint:
      zh: "在 observability 写事件响应/runbook；否则显式 WAIVED"
      en: "Add incident response/runbook to observability; otherwise mark WAIVED"

  - id: rdy_infra_manager
    role: infra_manager
    layer: operations
    concern: infra_plan                     # 服务器/存储/虚拟化
    tier_required: [team, platform]
    requires: [artifact_config_env.infra]
    severity: block
    scenario: "Given 10-config-and-env When ocn check Then 基础设施需求已声明，或显式 WAIVED（无服务端）"
    check:
      infra: not_empty
    fix_hint:
      zh: "声明基础设施需求；无服务端则显式 WAIVED"
      en: "Declare infra needs; if no server side, mark WAIVED"

  - id: rdy_network_engineer
    role: network_engineer
    layer: operations
    concern: network_requirements           # 网络/链路/防火墙/负载
    tier_required: [team, platform]
    requires: [artifact_config_env.network]
    severity: block
    scenario: "Given 10-config-and-env When ocn check Then 网络需求已声明，或显式 WAIVED（纯本地）"
    check:
      network: not_empty
    fix_hint:
      zh: "声明网络需求；纯本地无网络依赖则显式 WAIVED"
      en: "Declare network needs; if local-only, mark WAIVED"

  - id: rdy_service_delivery_manager
    role: service_delivery_manager
    layer: operations
    concern: delivery_acceptance            # 服务质量/跨团队交付/满意度
    tier_required: [team, platform]
    requires: [artifact_validation.acceptance_signoff]
    severity: warn          # 0.4.0 R3 降级: 引擎无法验签名真实性，solo/AI 语境必然代签——block 只产出伪签收
    scenario: "Given 13-validation When ocn brief Then 验收签收记录存在（谁验收、何时）"
    check:
      acceptance_signoff: not_empty
    fix_hint:
      zh: "在 validation 记录验收签收（谁验收、何时、结论）"
      en: "Record acceptance sign-off (who, when, verdict) in validation"

  - id: rdy_sre
    role: sre
    layer: operations
    concern: observability                  # 可用性/监控/故障恢复
    tier_required: [team, platform]
    requires: [artifact_observability.metrics]
    severity: block
    scenario: "Given 20-observability When ocn check Then 至少 1 个可观测指标/信号已定义，或显式 WAIVED"
    check:
      metrics: count_gte:1
    fix_hint:
      zh: "在 observability 定义至少 1 个可观测指标/信号；否则显式 WAIVED"
      en: "Define ≥1 observability metric/signal; otherwise mark WAIVED"

  - id: rdy_sys_admin
    role: sys_admin
    layer: operations
    concern: ops_maintenance                # 主机/账户/补丁/备份执行
    tier_required: [team, platform]
    requires: [artifact_observability.maintenance_plan]
    severity: block
    scenario: "Given 运维计划 When ocn check Then 维护/备份执行项非空，或显式 WAIVED"
    check:
      maintenance_plan: not_empty
    fix_hint:
      zh: "写维护/备份执行计划；否则显式 WAIVED"
      en: "Document maintenance/backup tasks; otherwise mark WAIVED"

  - id: rdy_training_specialist
    role: training_specialist
    layer: operations
    concern: user_docs                      # 培训/技能转移/上岗
    tier_required: [team, platform]
    requires: [repo.readme]
    severity: block
    scenario: "Given README When ocn check Then 含快速上手/用法（用户能自助上岗）"
    check:
      quickstart: not_empty
    fix_hint:
      zh: "在 README 加快速上手/用法章节"
      en: "Add a quickstart/usage section to the README"

  - id: rdy_bcm_manager
    role: bcm_manager
    layer: operations
    concern: business_continuity            # 业务连续性/容灾/演练
    tier_required: [platform]
    requires: [artifact_rollback.backup_restore_procedure]
    severity: warn          # 0.4.0 R1 降级: 原 backup_restore_tested:true 是自报布尔（引擎分不清"演练过"和"写了 true"），全手册最差谓词，清除
    scenario: "Given 12-rollback When ocn brief Then 备份+恢复操作步骤已成文（'是否真演练过'引擎无法核验，不做 block 判定）"
    check:
      backup_restore_procedure: not_empty
    fix_hint:
      zh: "在 rollback 写出备份+恢复的具体操作步骤（命令级）"
      en: "Document concrete backup+restore steps (command-level) in rollback"

  - id: rdy_capacity_planner
    role: capacity_planner
    layer: operations
    concern: capacity_plan                  # 容量预测/冗余/增长
    tier_required: [platform]
    requires: [artifact_validation.capacity_limits]
    severity: warn          # 0.4.0 R3 降级: v1 无压测探针要求，容量数字暂无现实锚（补压测探针后可升回 block）
    scenario: "Given 13-validation When ocn brief Then 容量/上限是带单位数字（如 max 10k items）"
    check:
      capacity_limits: numeric_with_unit
    fix_hint:
      zh: "写带单位的容量上限（如 max 10k items / QPS 上限）"
      en: "Set numeric capacity limits (e.g. max 10k items / QPS ceiling)"

  - id: rdy_dr_manager
    role: dr_manager
    layer: operations
    concern: disaster_recovery              # 灾备/恢复目标/切换演练
    tier_required: [platform]
    requires: [artifact_rollback.rollback_plan]   # 0.4.0: requires 对齐 block 判定字段
    severity: block
    scenario: "Given 12-rollback When ocn check Then 回滚计划存在（RTO/RPO 数字声明降为 brief 提示——R3: 无灾备演练探针即无锚）"
    check:
      rollback_plan: exists
      # rto_rpo: numeric_with_unit  ← 0.4.0 R3 移出 block 判定: 无演练探针时数字无锚，逼填即逼编
    fix_hint:
      zh: "写回滚计划，并给出带单位的 RTO/RPO；否则显式 WAIVED"
      en: "Add a rollback plan with numeric RTO/RPO; otherwise mark WAIVED"

  - id: rdy_iam_admin
    role: iam_admin
    layer: operations
    concern: access_control                 # 身份/账号/访问控制
    tier_required: [platform]
    requires: [artifact_ai_governance.authz_model]
    severity: block
    scenario: "Given 安全设计 When ocn check Then 权限/访问模型已定义，或显式 WAIVED（单用户本地）"
    check:
      authz_model: not_empty
    fix_hint:
      zh: "定义权限/访问模型；单用户本地工具则显式 WAIVED"
      en: "Define the authz/access model; if single-user local, mark WAIVED"

  - id: rdy_knowledge_manager
    role: knowledge_manager
    layer: operations
    concern: knowledge_capture              # 知识库/SOP/经验复用
    tier_required: [platform]
    requires: [artifact_decision_log.decision_log_entries, artifact_dev_log.dev_log_entries]
    severity: block
    scenario: "Given 决策日志+开发日志 When ocn check Then 决策与经验有沉淀（各至少 1 条）"
    check:
      decision_log_entries: count_gte:1
      dev_log_entries: count_gte:1
    fix_hint:
      zh: "维护决策日志与开发日志（各至少 1 条沉淀）"
      en: "Maintain a decision log and a dev log (≥1 entry each)"

  - id: rdy_middleware_engineer
    role: middleware_engineer
    layer: operations
    concern: middleware_ops                 # 应用服务器/中间件/消息
    tier_required: [platform]
    requires: [artifact_api.middleware_ownership]
    severity: block
    scenario: "Given 运行组件 When ocn check Then 中间件/消息依赖已声明运维归属，或显式 WAIVED"
    check:
      middleware_ownership: not_empty
    fix_hint:
      zh: "为中间件/消息依赖声明运维归属；无则显式 WAIVED"
      en: "Assign ops ownership for middleware/messaging deps; if none, mark WAIVED"

  - id: rdy_problem_manager
    role: problem_manager
    layer: operations
    concern: problem_management             # 根因/已知错误库/永久修复
    tier_required: [platform]
    requires: [artifact_debug.known_issues]
    severity: block
    scenario: "Given 14-debug When ocn check Then 已知问题/根因库存在，或显式 WAIVED"
    check:
      known_issues: not_empty
    fix_hint:
      zh: "在 debug 建已知问题/根因库；否则显式 WAIVED"
      en: "Maintain a known-issues/root-cause log in debug; otherwise mark WAIVED"

  - id: rdy_service_level_manager
    role: service_level_manager
    layer: operations
    concern: sla_defined                    # SLA/OLA/服务指标
    tier_required: [platform]
    requires: [artifact_observability.sla]
    severity: warn          # 0.4.0 R3 降级: local-first 无 uptime 测量面，SLA 数字无现实锚
    scenario: "Given 20-observability When ocn brief Then SLA/服务承诺为带单位数字，或显式 WAIVED"
    check:
      sla: numeric_with_unit
    fix_hint:
      zh: "写带单位的 SLA/服务承诺（如 可用性 99.9%）；否则显式 WAIVED"
      en: "Define numeric SLA/commitments (e.g. availability 99.9%); otherwise mark WAIVED"

  - id: rdy_soc_manager
    role: soc_manager
    layer: operations
    concern: security_operations            # 安全监控/告警/运营
    tier_required: [platform]
    requires: [artifact_ai_governance.security_monitoring]
    severity: block
    scenario: "Given 安全运营 When ocn check Then 安全监控/告警计划非空，或显式 WAIVED"
    check:
      security_monitoring: not_empty
    fix_hint:
      zh: "写安全监控/告警计划；否则显式 WAIVED"
      en: "Add a security monitoring/alerting plan; otherwise mark WAIVED"
`;
