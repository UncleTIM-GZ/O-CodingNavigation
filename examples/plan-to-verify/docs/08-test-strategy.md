# Test Strategy｜测试策略

> Example artifact for **Mini Task Tracker CLI** (`mtt`).
> Required sections (SOP 0.2.0): Unit Tests, Integration Tests,
> E2E or Smoke Tests, Fixtures, Coverage Expectation, Non-testable Risks.

## Unit Tests｜单元测试

- `core/task.ts` — pure helpers (`createTask`, `markDone`, `filterByTag`).
  Coverage target: 100% line + branch.
- `core/store.ts` — Zod parsing, schema-version inference, error mapping.
  Mock `fs` for the failure-injection cases.
- `cli/commands/*.ts` — argument parsing only; the I/O layer is mocked.

## Integration Tests｜集成测试

- Spawn the built CLI against a temporary `HOME` (`mktemp -d` + `HOME=$TMP`).
- Round-trip every command: `add → list → done → list → rm → list`.
- Assert both the stdout envelope and the on-disk `tasks.json` content.

## E2E or Smoke Tests｜端到端或冒烟测试

- `scripts/smoke.sh` — installs the built tarball into a temp prefix,
  walks every command in order, asserts exit codes and final file state.
- Runs in CI on every PR.

## Fixtures｜测试夹具

- `tests/fixtures/empty-store.json` — empty envelope (schemaVersion 1).
- `tests/fixtures/seed-3-tasks.json` — three tasks across two tags.
- `tests/fixtures/seed-500-tasks.json` — generated at test setup time
  (deterministic seed) for the `list --tag` performance test.

## Coverage Expectation｜覆盖率期望

| Layer       | Minimum |
| ----------- | ------- |
| `core/`     | 95%     |
| `cli/`      | 80%     |
| Project    | 85%     |

## Non-testable Risks｜不可测试风险

- Real filesystem corruption on rare hardware. We test the atomic-write
  protocol but cannot test every drive's sync semantics.
- User typing the wrong id (out-of-band human error). Documentation
  mitigation only.
- npm registry outage at install time. Documented in README; not
  testable from the test suite.
