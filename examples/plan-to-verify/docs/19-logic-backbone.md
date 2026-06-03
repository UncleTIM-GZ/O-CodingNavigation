# Logic Backbone｜逻辑主干

> Example fixture (SOP 0.3.0). A valid, well-wired backbone for the
> plan-to-verify demo: it passes the structural gate (no orphan / dangling /
> cycle / unbound-trigger; every node has a role).

## Nodes｜节点

| id | kind | role |
|---|---|---|
| `input_request` | input | input |
| `formula_estimate` | formula | intermediate |
| `score_readiness` | score | intermediate |
| `judgment_ship` | judgment | terminal_explanatory |
| `signal_block_ship` | signal | trigger |

## Dependencies｜依赖

- `input_request` → `formula_estimate` (feeds)
- `formula_estimate` → `score_readiness` (feeds)
- `score_readiness` → `signal_block_ship` (feeds)

## Decision Bindings｜判断绑定

- `score_readiness` → `judgment_ship` (serves)

## Signals｜信号

- `signal_block_ship` → `judgment_ship` (triggers) — actionable.

## Graph｜逻辑图

```ocn-logic-graph
nodes:
  - { id: input_request, kind: input, role: input, label: incoming request }
  - { id: formula_estimate, kind: formula, role: intermediate, label: estimate effort }
  - { id: score_readiness, kind: score, role: intermediate, label: readiness score }
  - { id: judgment_ship, kind: judgment, role: terminal_explanatory, label: ship? }
  - { id: signal_block_ship, kind: signal, role: trigger, label: block ship }
edges:
  - { from: input_request, to: formula_estimate, kind: feeds }
  - { from: formula_estimate, to: score_readiness, kind: feeds }
  - { from: score_readiness, to: signal_block_ship, kind: feeds }
  - { from: score_readiness, to: judgment_ship, kind: serves }
  - { from: signal_block_ship, to: judgment_ship, kind: triggers }
```
