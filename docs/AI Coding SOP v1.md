# AI Coding SOP v1.0｜O’CodingNavigator Default Profile

文档路径建议：`sops/default-ai-coding-sop/0.1.0/README.md`  
Profile ID：`default-ai-coding-sop`  
Profile Version：`0.1.0`  
适用产品：`O’CodingNavigator`  
适用命令：`ocn`  
文档类型：SOP Profile Source Document  
状态：v1.0 baseline

---

## 0. 文档身份

本文档不是普通方法论文章。

它同时承担三种角色：

1. **人类可读的 AI Coding SOP**
2. **O’CodingNavigator 的默认 SOP Profile**
3. **SOP Loader、Gate Engine、Artifact Registry、MCP Server 的上游契约来源**

旧版 SOP 已经明确提出：AI Coding 的目标不是让 AI 更快写代码，而是让 AI 在边界清楚、结构稳定、可验证、可复现、可回滚、可观察、可审计、可持续演化的流程中推进。 [oai_citation:0‡# AI Coding 最佳实践开发 SOP完整版.md](sediment://file_000000005ccc71fa8e78671110e4f833)

OCN v1.0 在此基础上进一步产品化：

> **把 AI Coding SOP 从“开发建议”，升级为“状态机驱动、artifact 约束、gate 检查、audit 留痕、MCP 可调用的本地流程操作系统”。**

---

# 1. 总原则

AI Coding 最危险的不是 AI 不会写代码。

真正危险的是：

目标不清。  
范围失控。  
数据混乱。  
接口不一致。  
测试不可验证。  
修改没有记录。  
项目上下文丢失。  
后续无法接手。  
AI 越权替人做关键判断。

因此，O’CodingNavigator 的默认 SOP 不以“多写代码”为核心目标，而以以下原则为核心：

```text
稳定输入
明确边界
结构化 Spec
可验证结果
可追溯记录
可回退路径
可审计过程
可持续演化