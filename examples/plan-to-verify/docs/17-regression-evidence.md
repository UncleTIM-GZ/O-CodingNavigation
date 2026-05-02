# Regression Evidence｜回归证据

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Regression Scope, Commands Run, Result,
> Previously Broken Behavior, Current Behavior, Residual Risk.
>
> The commands and outputs below are **illustrative example evidence**
> showing the shape of regression evidence for the v1.0.0 build.

## Regression Scope｜回归范围

- The `done` integration test fix from `docs/16-failure-fix-log.md`
  Entry 1 (PR #44 illustrative).
- The two preemptively-fixed stdout-parsing tests called out in the
  same fix log (Remaining Risk).
- The full integration suite, run 50× back-to-back to catch any
  remaining flake.

## Commands Run｜执行命令

```bash
# 1) The specific previously-flaky test, repeated 50 times.
npm run test -- --repeat 50 round-trip

# 2) The two preemptively converted tests, repeated 20 times each.
npm run test -- --repeat 20 add
npm run test -- --repeat 20 list

# 3) Full integration sweep.
npm run test -- integration
```

## Result｜结果

- `round-trip` — 50/50 passes, 0 flakes.
- `add` — 20/20 passes, 0 flakes.
- `list` — 20/20 passes, 0 flakes.
- Full integration sweep — 47/47 passes; total wall-clock ~3.4 s.

## Previously Broken Behavior｜此前异常行为

Before PR #44 (illustrative):

- `round-trip` failed roughly 1-in-12 runs with
  `Error: ERR_TASK_NOT_FOUND` because the harness captured a truncated
  id when stdout flushed mid-line.
- The two sibling tests had latent versions of the same parsing race
  but had not yet flaked.

## Current Behavior｜当前行为

After the fix:

- All three tests parse `--json` envelopes via `JSON.parse(stdout)` and
  read the id field directly. No stdout-text matching remains in the
  integration suite.
- 70 cumulative repeats observed zero flakes.

## Residual Risk｜残留风险

- Stdout-text parsing in **unit** tests was not re-audited; those tests
  use mocked I/O and so are not subject to the same flush race, but a
  future v1.x change should confirm. Tracked as a v1.1 candidate.
- The 50-run repeat does not prove the absence of a once-per-1000-run
  flake; future regression evidence may extend the repeat count if a
  similar pattern appears.
