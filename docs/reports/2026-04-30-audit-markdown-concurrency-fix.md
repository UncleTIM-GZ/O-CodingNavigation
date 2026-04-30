# Audit Markdown Concurrency Fix｜Audit Markdown 并发修复报告

> Date: 2026-04-30
> Branch: `fix/audit-markdown-first-write-concurrency` (off `main` at `188594a`).
> Companion DEC: [DEC-014 — Restore Audit Markdown Concurrency Test to Default Gate](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate).
> Supersedes (operationally): [DEC-013 — Quarantine audit-markdown concurrent first-write flake](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate). DEC-013 itself remains valid as the historical record of why the quarantine existed.

---

## 1. Summary

| Field | Value |
|---|---|
| Race fixed | ✅ Audit-markdown first-write concurrency race in `src/core/audit/audit-markdown.ts` |
| Test restored | ✅ `concurrent first-writes still produce exactly one header` is back in the default `tests/unit/` suite |
| Targeted 100-run validation | ✅ **100 / 100 passed** |
| Default test gate | ✅ Restored to **394 passed across 63 files** (was 393 under the DEC-013 quarantine) |
| `tests/flaky/` directory | ✅ Removed |
| `vitest.flaky.config.ts` | ✅ Removed |
| `package.json` `test:flaky` script | ✅ Removed |
| `vitest.config.ts` `tests/flaky/**` exclude | ✅ Removed |
| Package on npm | unchanged at `o-coding-navigation@0.1.0-alpha.0` |

> **External MCP Host Validation pending.**
> **Do not claim verified Claude Desktop / Cursor / Cline compatibility until PR D completes.**

---

## 2. Root cause

The previous `appendAuditMarkdown` implementation used `fs.open(file, "wx")` to atomically claim creator status, then wrote the header through the returned handle:

```ts
const handle = await fs.open(file, "wx");
try { await handle.writeFile(MARKDOWN_HEADER, "utf8"); }
finally { await handle.close(); }
// EEXIST falls through to the body append
await fs.appendFile(file, renderMarkdownSection(event), "utf8");
```

The atomicity claim is correct **for the open syscall**, but the gap between `open(wx)` (which creates a 0-byte file) and `handle.writeFile(header)` (which fills it) is observable to a concurrent writer. The race that produced the test failure under full-suite parallel load:

1. **Writer A**: `fs.open(file, "wx")` succeeds → file exists, 0 bytes, A holds the handle.
2. **Writer B (concurrent)**: `fs.open(file, "wx")` → **EEXIST** (file exists). B's catch handler runs, B falls through.
3. **Writer B**: `fs.appendFile(file, sectionB)` opens the file with `O_APPEND`. The kernel seeks to EOF before each write; current EOF is offset 0 (file is empty). B writes section B (~500 bytes) at offset 0. File now has 500 bytes containing only section B.
4. **Writer A**: `handle.writeFile(MARKDOWN_HEADER)` writes through A's handle (no `O_APPEND`). The handle's seek position is 0. Writes ~200 bytes of header at offset 0, **overwriting the first 200 bytes of section B** — including section B's `## ` heading line.
5. **Writer A**: `handle.close()`, then `fs.appendFile(file, sectionA)` appends section A at the end.

End state: the file contains ~700 bytes — the header (which clobbered the start of B's section) + the corrupted tail of B's section (with its `## ` line gone) + section A appended at the end. The regex `^## ` matches **only section A's heading**. The test correctly observed `expect(sections).toHaveLength(3)` failing with received length `1`.

The flake was non-deterministic because step 3 must *interleave* with step 4: B's appendFile open, B's appendFile write, A's handle.writeFile, A's handle.close. In isolation (single test running), the kernel scheduler tends to complete A's handle write before B's appendFile open, and the test passes. Under parallel load (the full vitest suite running with `pool: forks`), the timing changes and the race surfaces.

The flake-quarantine report's **suggested patch** ([`docs/reports/2026-04-29-flaky-test-quarantine.md`](2026-04-29-flaky-test-quarantine.md) §5) was `fs.writeFile(path, header, { flag: "wx" })`. **That has the same race** — internally, Node.js's `fs.writeFile` opens, writes, and closes as separate libuv work items; a concurrent writer's `open(wx)` returns EEXIST after the first writer's open creates the empty file but before the first writer's write completes.

Identifying the race precisely changes the right fix.

---

## 3. Implementation

### Algorithm

Use **`writeFile` to a unique tmp file, then atomically `link()` the tmp into place**. `link(2)` is a single atomic filesystem syscall that either:

- creates a hard link from `tmp` to `file` (success), OR
- fails with `EEXIST` because `file` already exists.

Crucially, `link()` only succeeds against a **fully populated** source. The tmp file is written to completion before `link()` is called, so the inode the link points at *already contains the full header* at the moment the link transitions the target name into existence. There is no observable empty-file window.

### Code

`src/core/audit/audit-markdown.ts`:

```ts
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "../../types/audit.js";
import { AuditPaths } from "./audit-paths.js";

async function ensureMarkdownHeader(file: string): Promise<void> {
  // Fast path: file already exists with full header (set by a previous call).
  try {
    await fs.access(file);
    return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Slow path: write the header to a unique tmp file, then atomically link.
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, MARKDOWN_HEADER, "utf8");
  try {
    await fs.link(tmp, file);
  } catch (err) {
    // EEXIST means another writer linked their tmp first; their link
    // references a fully-populated header inode, so we can safely append.
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  } finally {
    try { await fs.unlink(tmp); } catch { /* swallow */ }
  }
}

export async function appendAuditMarkdown(
  root: string,
  event: AuditEvent,
): Promise<void> {
  const file = AuditPaths.markdownFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  await ensureMarkdownHeader(file);
  await fs.appendFile(file, renderMarkdownSection(event), "utf8");
}
```

### Why this is race-free

| Concurrent step | Outcome |
|---|---|
| Two writers each call `writeFile(unique-tmp, header)`. | Both succeed. Each tmp is a different filename, no contention. |
| Both call `fs.link(tmp, file)` simultaneously. | One link succeeds; one returns `EEXIST`. The successful link references the inode of the winner's tmp file, which contains the full header. |
| Both call `fs.appendFile(file, section)`. | The file is non-empty when each appendFile opens it. Each `appendFile` uses `O_APPEND`, which the kernel seeks-then-writes atomically per `write(2)` call (atomic for sizes ≤ `PIPE_BUF` = 4096 bytes; our sections are ~500 bytes). The kernel serialises the two writes; both sections appear in the file. |

The fast path (`fs.access`) is a TOCTOU optimisation. If the file already exists, we skip the link dance. If between the access check and the writeFile/link the file is unlinked (a destructive operation OCN doesn't perform), `link()` would simply succeed (unlikely race) or fail with EEXIST after we re-create. Either way, we're safe.

### Why not the simpler suggested approach

The flake-quarantine report's §5 suggested:

```ts
try { await fs.writeFile(path, header, { flag: "wx" }); }
catch (err) { if (err.code !== "EEXIST") throw err; }
await fs.appendFile(path, section);
```

This is conceptually identical to the previous broken code: `fs.writeFile(path, ..., { flag: "wx" })` is internally `open(O_CREAT|O_EXCL) → write → close`, where the open creates an empty file that's observable to other writers before the write completes. The same overwrite-of-section-B race fires.

The link approach is slightly more code, but it's the correct fix.

---

## 4. Test restored

| Before | After |
|---|---|
| `tests/flaky/audit-writer-markdown-concurrent-first-write.test.ts` (1 test, in a quarantine directory excluded from the default suite) | Merged back into `tests/unit/audit-writer-markdown.test.ts` (last `it()` block of the existing `describe("appendAuditMarkdown — first-write + append")`) |
| Test name: `[FLAKY] appendAuditMarkdown — concurrent first-writes > concurrent first-writes still produce exactly one header` | Test name: `appendAuditMarkdown — first-write + append > concurrent first-writes still produce exactly one header` (no `[FLAKY]` prefix) |
| Default suite skipped it | Default suite includes it |
| Pointer comment in the original file | Replaced with a one-line "Restored to the default suite by DEC-014" pointer comment |

Verified: `npm run test` runs the test by default. Test count goes from 393 → 394.

---

## 5. Validation evidence

### Targeted 100-run validation

```
$ for i in $(seq 1 100); do
    npx vitest run tests/unit/audit-writer-markdown.test.ts \
      || { echo "Run $i FAILED"; exit 1; }
  done
=== Result: 100 / 100 passed; 0 failed ===
```

No early exit. The full file (7 tests, including the restored concurrent-first-writes test) passed 100 consecutive isolated runs. Note: this is the same kind of run that historically passed in isolation while failing under full-suite parallel load. The next gate (full suite) is the real test.

### Full-suite gates

| Gate | Result |
|---|---|
| `npm run lint` | ✅ clean |
| `npm run typecheck` | ✅ clean |
| `npm run test` | ✅ **394 passed across 63 files** |
| `npm run test:coverage` | ✅ 394 passed; **83.45 % lines / 85.06 % branches / 90.76 % functions** (all above thresholds 70 / 60 / 70 / 70) |
| `npm run build` | ✅ clean |

The full-suite test pass is the meaningful one — it runs with `pool: forks` (parallel test files), which is the exact load profile that historically exposed the flake. The fix produces 394/394 green under that load.

---

## 6. Flaky infrastructure cleanup

DEC-013 created a quarantine directory + a separate vitest config + a `test:flaky` script + a `tests/flaky/**` exclude in the default vitest config. With the underlying race fixed and the only quarantined test restored, **all of that infrastructure is now removed**:

| Artifact | Before DEC-014 | After DEC-014 |
|---|---|---|
| `tests/flaky/` directory | existed; contained 1 file | **removed** |
| `tests/flaky/audit-writer-markdown-concurrent-first-write.test.ts` | quarantined location | **removed** (the test itself moved back to `tests/unit/audit-writer-markdown.test.ts`) |
| `vitest.flaky.config.ts` | dedicated runner config | **removed** |
| `package.json` `scripts.test:flaky` | `vitest run --config vitest.flaky.config.ts` | **removed** (`node -p "require('./package.json').scripts['test:flaky']"` → `undefined`) |
| `vitest.config.ts` `exclude` array | included `"tests/flaky/**"` | **removed** (default vitest exclude `["**/node_modules/**", "**/dist/**"]` is implicit; we no longer override) |

DEC-013 itself remains in the decision log as the historical record of the quarantine. DEC-014 supersedes it operationally.

---

## 7. Remaining risks

| ID | Risk | Mitigation |
|----|------|------------|
| RR-fix-1 | The fix relies on `fs.link()` (POSIX `link(2)` / Windows hardlinks). Exotic filesystems like FAT32 or some network filesystems may not support hard links. | OCN's `engines.node ≥ 20` requires a host OS that supports hard links on the filesystems users typically install on. If a user runs OCN on FAT32, they will get a clear `EXDEV`/`EOPNOTSUPP` error on first audit write — a loud failure mode, not silent corruption. A future portable fallback could use `rename(tmp, file)` (also atomic, but with different overwrite semantics — see §8). Out of scope here. |
| RR-fix-2 | Tmp files (`<file>.<uuid>.tmp`) leak in `.ocoding/audit/` if the process crashes between `writeFile(tmp)` and `unlink(tmp)`. | UUID-suffixed names mean no collisions across crashes. Stale `*.tmp` files in the audit directory are inert. A future `ocn doctor` may sweep them. Not a correctness issue. |
| RR-fix-3 | The JSONL source of truth (`audit-events.jsonl`) is unchanged by this fix; the markdown narrative remains a secondary view. If the markdown ever diverges from the JSONL, the JSONL is canonical. | This is the design intent (per DEC of the audit subsystem). No change. |
| RR-fix-4 | A future contributor may revert the fix without realising the race history. | DEC-014's §Decision spells out the algorithm. The default suite includes the regression test. CI Stability Audit F-2 is still on record. |
| RR-fix-5 | PR D (External MCP Host Validation) is still pending. | DEC-005 caveat continues to apply. |

---

## 8. Future work (not in scope)

- **Portable fallback for non-link filesystems**: if a user reports `link()` failing on their filesystem, add a fallback that uses `rename(tmp, file)` (`rename(2)` is also atomic on POSIX). Note: `rename` *overwrites* the destination if it exists, so concurrent renames from multiple writers can race in a way that the "winner" overwrites a file that's been appended to. The mitigation is non-trivial and out of scope until a real bug report exists.
- **`ocn doctor` to sweep stale `*.tmp` files** in `.ocoding/audit/`. Pre-existing deferred item; this fix doesn't change its priority.
- **Apply the same atomic-link pattern to other "first-write" sites** if any exist. None identified in this pass; the JSONL writer (`audit-jsonl.ts`) uses pure `O_APPEND` semantics and doesn't have a header-vs-body race.
- **Publish an alpha.1**: this fix lands on `main`, but DEC-012 only authorised the publish of `0.1.0-alpha.0`. Whether to ship a follow-up patch publish is its own DEC entry. The package on npm currently has the racy code; users who hit the race in their own usage would see the same symptom. **This is a known issue for `0.1.0-alpha.0` users** and is recorded as a follow-up.

---

## 9. DEC reference

[DEC-014 — Restore Audit Markdown Concurrency Test to Default Gate](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate)

DEC-014 includes the full rationale, options A–F (F adopted), validation matrix, consequences, risks, and the explicit non-authorisation of `npm publish` / version bump / tag / release as part of this fix.

---

## 10. References

- `src/core/audit/audit-markdown.ts` — modified file with `ensureMarkdownHeader` + atomic-link approach.
- `tests/unit/audit-writer-markdown.test.ts` — the restored test (last `it()` block).
- [DEC-013](../20-decision-log.md#dec-013quarantine-audit-markdown-concurrent-first-write-flake-from-publish-gate) — original quarantine.
- [DEC-014](../20-decision-log.md#dec-014restore-audit-markdown-concurrency-test-to-default-gate) — this fix's authorising decision.
- [`docs/reports/2026-04-29-flaky-test-quarantine.md`](2026-04-29-flaky-test-quarantine.md) §5 — the quarantine report's suggested patch (superseded by the link approach in §3 of this report).
- [`docs/reports/2026-04-29-ci-stability-audit.md`](2026-04-29-ci-stability-audit.md) §11 finding F-2 — the original push-to-main flake observations that led to DEC-013, now resolved.
- [`docs/reports/2026-04-29-npm-alpha-publish-report.md`](2026-04-29-npm-alpha-publish-report.md) §11 item 4 — the "fix audit-markdown race" follow-up that this PR closes.
- npm package: https://www.npmjs.com/package/o-coding-navigation (still at `0.1.0-alpha.0` with the racy code; an `alpha.1` publish requires its own DEC).
