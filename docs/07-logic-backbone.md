# Logic Backbone｜逻辑主干

> SOP 0.3.0 artifact (`artifact_logic_backbone`). This is OCN dogfooding its own
> new artifact: it models the logic-backbone gate's own computation/decision
> pipeline. The `ocn-logic-graph` block below passes the structural gate
> (no orphan / dangling / cycle / unbound-trigger; every node has a role).
> See `docs/amendments/2026-06-03-logic-backbone-amendment.md` (AM-003).

## Nodes｜节点

| id | kind | role | meaning |
|---|---|---|---|
| `input_artifact_md` | input | input | the authored `docs/07-logic-backbone.md` |
| `formula_extract_block` | formula | intermediate | extract the fenced `ocn-logic-graph` block |
| `formula_zod_parse` | formula | intermediate | YAML load + zod schema validation |
| `score_validation` | score | intermediate | the validator's issue set (5 drift checks) |
| `judgment_gate` | judgment | terminal_explanatory | pass / blocked decision |
| `signal_block` | signal | trigger | blocks advance + writes the audit event |
| `score_brief_summary` | score | terminal_explanatory | execution order + triggers shown in `ocn brief` |

## Dependencies｜依赖

Execution order (what computes first → last):

- `input_artifact_md` → `formula_extract_block` (feeds)
- `formula_extract_block` → `formula_zod_parse` (feeds)
- `formula_zod_parse` → `score_validation` (feeds)
- `score_validation` → `signal_block` (feeds)

## Decision Bindings｜判断绑定

Which computation serves which judgment (DMN layering):

- `score_validation` → `judgment_gate` (serves) — the validation result decides pass/blocked.

## Signals｜信号

- `signal_block` → `judgment_gate` (triggers) — a blocked verdict drives the
  block-advance + audit action. **Actionable.**
- `score_brief_summary` → `judgment_gate` (explains) — the brief summary only
  narrates the decision; it drives nothing. **Hint / explanatory.**

## Graph｜逻辑图

```ocn-logic-graph
nodes:
  - { id: input_artifact_md, kind: input, role: input, label: authored markdown }
  - { id: formula_extract_block, kind: formula, role: intermediate, label: extract fenced block }
  - { id: formula_zod_parse, kind: formula, role: intermediate, label: yaml load + zod parse }
  - { id: score_validation, kind: score, role: intermediate, label: validator issue set }
  - { id: judgment_gate, kind: judgment, role: terminal_explanatory, label: pass or blocked }
  - { id: signal_block, kind: signal, role: trigger, label: block advance + audit }
  - { id: score_brief_summary, kind: score, role: terminal_explanatory, label: brief summary }
edges:
  - { from: input_artifact_md, to: formula_extract_block, kind: feeds }
  - { from: formula_extract_block, to: formula_zod_parse, kind: feeds }
  - { from: formula_zod_parse, to: score_validation, kind: feeds }
  - { from: score_validation, to: signal_block, kind: feeds }
  - { from: score_validation, to: judgment_gate, kind: serves }
  - { from: signal_block, to: judgment_gate, kind: triggers }
  - { from: score_brief_summary, to: judgment_gate, kind: explains }
```
