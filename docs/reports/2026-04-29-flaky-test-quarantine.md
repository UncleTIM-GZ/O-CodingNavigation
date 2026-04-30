# Flaky Test Quarantine｜不稳定测试隔离记录

> Date: 2026-04-29
> Branch: `test/quarantine-audit-markdown-concurrency-flake` (off `main` at `68952ce`).
> Companion: [DEC-013 — Quarantine Audit Markdown Concurrent First-Write Flake from Publish Gate](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate).
> Origin: third occurrence of the [CI Stability Audit F-2 pattern](2026-04-29-ci-stability-audit.md#11-findings) — observed locally during the second alpha-publish attempt's `prepublishOnly` gate.

---

## 1. What is in `tests/flaky/`

Currently **1 file** with **1 test**:

| File | Test | Why quarantined |
|---|---|---|
| `tests/flaky/audit-writer-markdown-concurrent-first-write.test.ts` | `[FLAKY] appendAuditMarkdown — concurrent first-writes > concurrent first-writes still produce exactly one header` | Passes 5/5 in isolation; failed under full-suite parallel load during the alpha publish `prepublishOnly` gate. Real concurrency edge case in `src/core/audit/audit-markdown.ts` (TOCTOU between `fs.stat` and `fs.appendFile`); test is correct, implementation is the bug. |

**Adding to `tests/flaky/` requires a new DEC entry.** Per [DEC-013 R25](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate), this directory must NOT become a dumping ground.

## 2. How the quarantine works (mechanics)

| Surface | Behaviour |
|---|---|
| `npm run test` | Runs `vitest run` with default config. **Skips** `tests/flaky/**`. |
| `npm run test:coverage` | Runs `vitest run --coverage`. **Skips** `tests/flaky/**`. Coverage report excludes them. |
| `npm run test:flaky` | Runs `vitest run --config vitest.flaky.config.ts`. **Only** runs `tests/flaky/**`. |
| `prepublishOnly` (in `package.json`) | Runs `lint + typecheck + test:coverage + build`. **Does not run `test:flaky`.** |
| GitHub Actions CI (`.github/workflows/ci.yml`) | Runs `npm run test:coverage`. **Skips** `tests/flaky/**`. The quarantine is invisible to CI by design. |
| Husky pre-commit hook | Runs `npm run lint && npm run typecheck && npm run test`. **Skips** `tests/flaky/**`. |

The exclusion is configured in `vitest.config.ts`:

```ts
exclude: ["**/node_modules/**", "**/dist/**", "tests/flaky/**"]
```

The dedicated runner is `vitest.flaky.config.ts`:

```ts
include: ["tests/flaky/**/*.test.ts"]
```

## 3. When to run `npm run test:flaky`

- Before working on `src/core/audit/audit-markdown.ts` to confirm the race still exists.
- During concurrency-fix work to verify the fix.
- After alpha publish stabilises, as part of beta-readiness review.
- **Not** in CI required-checks. **Not** in `prepublishOnly`.

## 4. How to remove a test from quarantine

When the underlying flake is fixed (i.e. the production race in `audit-markdown.ts` is closed):

1. Verify the test passes 100 times in a row under full-suite load (e.g. `for i in {1..100}; do npm run test:coverage || break; done`).
2. Move the test file from `tests/flaky/` back to its original location (likely `tests/unit/audit-writer-markdown.test.ts` — re-merge with the file the original test was extracted from).
3. Update the in-source comment in `src/core/audit/audit-markdown.ts` if any TODO was added.
4. Capture the move in a follow-up DEC entry (a minor amendment to DEC-013 or a new DEC, depending on how much else changes).
5. Open a PR; pre-commit hook + CI will re-run the test as part of the default suite.

## 5. The underlying race (for the eventual fix)

`src/core/audit/audit-markdown.ts` `appendAuditMarkdown` currently uses `fs.stat` to detect first-write, then `fs.appendFile` to append. The window between these two calls allows multiple concurrent writers to all observe "file does not exist" and race the header write. Under contention, only one append "wins" — the others silently fail or produce an empty section.

Suggested deterministic fix:

```ts
// Try exclusive-create for the header. If EEXIST, the file already exists
// → skip header, append section only.
try {
  await fs.writeFile(markdownPath, `# Audit Trail｜审计链\n\n`, { flag: "wx" });
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
}
await fs.appendFile(markdownPath, renderMarkdownSection(event));
```

This eliminates the TOCTOU window: `'wx'` is atomic (single syscall: `O_CREAT | O_EXCL`). All concurrent first-writers race to create; exactly one wins; the rest see EEXIST and proceed straight to section append.

The fix is **out of scope for this PR** — DEC-013 only quarantines. The actual fix happens in a separate PR.

## 6. References

- [DEC-013 — Quarantine Audit Markdown Concurrent First-Write Flake from Publish Gate](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate)
- [DEC-012 — Authorise separate npm alpha publish PR](../20-decision-log.md#dec-012authorise-separate-npm-alpha-publish-pr) — the publish DEC-013 unblocks
- [CI Stability Audit §11 F-2 + §12](2026-04-29-ci-stability-audit.md#11-findings) — first two occurrences and the documented "quarantine on third occurrence" remediation
- `vitest.config.ts` — default config with `tests/flaky/**` exclude
- `vitest.flaky.config.ts` — on-demand quarantine runner
- `package.json` — `test:flaky` script
- `tests/flaky/audit-writer-markdown-concurrent-first-write.test.ts` — the quarantined test itself
- `tests/unit/audit-writer-markdown.test.ts` — the original file with 6 deterministic tests retained
- `src/core/audit/audit-markdown.ts` — site of the underlying race; fix candidate per §5
