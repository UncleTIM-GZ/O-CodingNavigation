# Verification Report｜验证报告

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Lint Result, Typecheck Result, Test Result,
> Coverage Result, Build Result, Smoke Result, Known Failures.
>
> The numbers below are **illustrative example evidence** of what an `mtt`
> author would record after running the verification commands locally; this
> OCN example does not invoke `mtt` itself.

## Lint Result｜Lint 结果

- Command: `npm run lint` (eslint @typescript-eslint/recommended).
- Status: **pass**.
- Warning count: 0.

## Typecheck Result｜类型检查结果

- Command: `npm run typecheck` (`tsc --noEmit`).
- Status: **pass**.
- Suppressed errors: 0. No `// @ts-expect-error` in the codebase.

## Test Result｜测试结果

- Command: `npm run test` (vitest run).
- Total: 47 / Passed: 47 / Failed: 0 / Skipped: 0.
- Wall-clock: ~3.4 s on the CI runner.

## Coverage Result｜覆盖率结果

| Layer       | Statement | Branch | Function |
| ----------- | --------- | ------ | -------- |
| `src/core/` | 96%       | 92%    | 100%     |
| `src/cli/`  | 84%       | 80%    | 90%      |
| Project     | 91%       | 86%    | 95%      |

All above the thresholds in `docs/08-test-strategy.md`.

## Build Result｜构建结果

- Command: `npm run build` (`tsc -p tsconfig.build.json`).
- Status: **pass**.
- Artifact path: `dist/cli/index.js` (executable bit set).

## Smoke Result｜冒烟测试结果

- Command: `bash scripts/smoke.sh`.
- Status: **pass**.
- Walked: `add → list → done → list → rm → list` against a temp `HOME`.
- Final assertion: `tasks.json` returned to empty envelope after `rm`.

## Known Failures｜已知失败

None. All quality gates green for v1.0.0.

A previously red item — a flaky `done` integration test caused by
non-deterministic ULID generation in the test harness — is recorded
in `docs/16-failure-fix-log.md` and verified fixed in
`docs/17-regression-evidence.md`.
