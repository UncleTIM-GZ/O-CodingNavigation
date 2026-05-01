# CI Node 22 Matrix Expansion

> Date: 2026-05-01
> Branch: `ci/node-22-matrix`
> Caveat: External MCP Host Validation pending for Cursor / Cline (DEC-017 closed for Claude Desktop only). This PR does not change Host validation status.

---

## 1. Summary

This PR expands CI from **Node 20 only** to **Node 20 + Node 22**, fulfilling DEC-018's CI-matrix prerequisite for beta candidate preparation. The change is scoped to `.github/workflows/ci.yml` only — no source, test, package, or release-metadata change. Sequenced **after** the lock-observability flake hardening (PR #34) so that adding a faster Node version cannot revive the previously-known timing race.

| Field | Value |
| --- | --- |
| Workflow file changed | `.github/workflows/ci.yml` (single file) |
| Strategy | `fail-fast: false`, `matrix.node-version: [20, 22]` |
| Job name | `build (node 20)` and `build (node 22)` (per-cell job names so PR review surfaces each Node version distinctly) |
| Coverage artifact | now uploaded as `coverage-node-${{ matrix.node-version }}` to satisfy `actions/upload-artifact@v4`'s no-duplicate-name constraint |
| Steps changed | none (same `npm ci` → `lint` → `typecheck` → `build` → `test:coverage` → upload sequence) |
| `engines.node` | `>=20` (already covers both Node 20 and Node 22 — no `package.json` change needed) |
| Local Node 20 result | 449 / 449 ✅ tests, lint ✅, typecheck ✅, build ✅, coverage 83.47% |
| Local Node 22 result | not run (no Node 22 on the local WSL2 box; no nvm/fnm). Node 22 is verified by **GitHub Actions** on this PR. Local results have not been fabricated. |
| Source / test code changes | **none** |
| `package.json` / `package-lock.json` changes | **none** (kept `engines: ">=20"`, no dep graph touch) |
| Caveat impact | none. Claude Desktop validation status (DEC-017) unchanged; Cursor / Cline still unverified. |
| npm | no publish, no version bump, no dist-tag movement, no `latest` promotion. |

## 2. Decision basis

| Reference | Bearing on this PR |
| --- | --- |
| **DEC-010** — CI matrix policy: single-cell `ubuntu-latest` + Node 20 for alpha; **expand at beta**. | This PR executes the "expand at beta" clause of DEC-010 by widening to Node 20 + 22 as part of beta candidate preparation. DEC-010 is **not** rescinded; it is satisfied. |
| **DEC-018** — Begin Beta Candidate Preparation. Lists "Expand CI matrix per DEC-010 follow-up, at minimum Node 20 + Node 22" as prerequisite #2. | This PR is that prerequisite. |
| **DEC-017** — Close Claude Desktop MCP Host validation caveat. | Not impacted by this PR. Cursor / Cline remain unverified — no claim added or removed. |
| `docs/reports/2026-04-29-ci-stability-audit.md` | Documents the audit-markdown concurrency flake history that motivated the cautious matrix-expansion sequence. |
| `docs/reports/2026-05-01-state-store-lock-observability-flake-hardening.md` | The **previous** PR (PR #34) — removed the lock-observability timing race that would otherwise be the obvious lurking trigger when a faster Node version is added. |

DEC-010 explicitly anticipated this expansion at beta. DEC-018 reaffirmed it as a beta prerequisite. The PR is the routine execution of those two decisions.

## 3. Why now

The previous PR (#34) hardened the `state-store-atomic.test.ts` lock-observability test, replacing a 1ms `setInterval` polling loop with a deterministic `LockLifecycleHook`-based observation. That test had already flaked once on a fast CI runner (PR #33 attempt 1). Adding a Node 22 cell — which on Linux runs on a newer V8 with different timer/microtask scheduling — would have made the polling-based race more likely to fire. Sequencing the matrix expansion **after** the flake hardening means we are not stacking risks: the underlying race no longer exists, so the new Node version can be evaluated on its own merit rather than re-litigating a known flake.

## 4. Workflow changes

`.github/workflows/ci.yml` is the only file changed. The diff is small and self-contained:

```diff
 jobs:
   build:
+    name: build (node ${{ matrix.node-version }})
     runs-on: ubuntu-latest
     timeout-minutes: 10
+    strategy:
+      fail-fast: false
+      matrix:
+        node-version: [20, 22]
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
-          node-version: 20
+          node-version: ${{ matrix.node-version }}
           cache: npm
+      - name: Print runtime versions
+        run: |
+          node --version
+          npm --version
       - name: Install dependencies
         run: npm ci
       …
       - name: Upload coverage report
         if: always()
         uses: actions/upload-artifact@v4
         with:
-          name: coverage
+          name: coverage-node-${{ matrix.node-version }}
           path: coverage/
```

### What changed

1. **Matrix.** `strategy.matrix.node-version: [20, 22]` with `fail-fast: false`. Each Node version is a first-class, independently-failing signal — the older "Node 20 alone" run is preserved as the `node-version: 20` cell.
2. **Per-cell job name.** `name: build (node ${{ matrix.node-version }})` so PR review surfaces "build (node 20)" and "build (node 22)" as separate required checks.
3. **Runtime version print.** A new explicit step echoes `node --version` and `npm --version` at the top of each cell. Cheap, makes log triage trivial.
4. **Coverage artifact name.** `actions/upload-artifact@v4` rejects duplicate artifact names within the same workflow run. The name is now `coverage-node-${{ matrix.node-version }}` (e.g. `coverage-node-20` and `coverage-node-22`). Both artefacts continue to be uploaded with `if: always()`.

### What did NOT change

- `runs-on: ubuntu-latest`, `timeout-minutes: 10`, `permissions: contents: read`, the `on:` trigger set, the SAFE-comment header — all preserved verbatim.
- The seven core steps (`checkout`, `setup-node`, `npm ci`, `lint`, `typecheck`, `build`, `test:coverage`, upload) — same names, same commands. Nothing was removed or downgraded. `test:coverage` was **not** demoted to `test`.
- No Windows / macOS expansion. Per DEC-010, OS expansion is a separate later decision (likely at GA, per DEC-007 §"GA requires").
- No new beta-publish workflow.
- No new `prepublishOnly` change. `package.json` is untouched.

## 5. Local validation

Local environment at the time of this PR's preparation:

| Item | Value |
| --- | --- |
| Local Node | `v20.20.0` |
| Local npm | `11.9.0` |
| Local OS | Linux (WSL2 on Windows; kernel `6.6.87.2-microsoft-standard-WSL2`) |
| nvm / fnm available | **no** (verified via `command -v fnm`, `command -v nvm`, `ls /usr/local/n`) |

Node 20 local results (the same sequence the CI cell runs):

```
$ node -v
v20.20.0
$ npm -v
11.9.0
$ npm ci
added 304 packages in 4s
$ npm run lint        → clean
$ npm run typecheck   → clean
$ npm run build       → emits dist/ (incl. chmod +x on cli/mcp entries)
$ npm run test:coverage
  Test Files  68 passed (68)
  Tests       449 passed (449)
  Coverage    overall 83.47% (≥ 80% gate)
```

Node 22 was **not** run locally because no Node 22 toolchain is installed on this WSL2 box and no nvm/fnm is available. Per the prompt's hard rule "如果本机没有 Node 22，不要伪造 Node 22 本地结果", Node 22 verification comes from this PR's GitHub Actions matrix run — that is the canonical signal the CI matrix expansion is designed to produce, and treating it as authoritative is the correct hand-off.

## 6. GitHub Actions validation

Both Node versions are verified by the PR's CI run:

- `build (node 20)` — re-runs the same sequence that has been green on every PR since the audit-markdown flake was fixed (DEC-014). A change in this cell would indicate a regression introduced by the matrix expansion itself, not by Node 22.
- `build (node 22)` — first-time signal. The test suite, lint config (`@typescript-eslint`), TypeScript compiler (`tsc --noEmit`), `vitest@2.1.x`, and `tsx` runtime have all been observed working on Node 22 in their respective upstream CI; if any subtle Node-22-specific incompatibility surfaces, the cell will report it independently of Node 20 (because `fail-fast: false`).

If Node 22 fails on this PR, the report will be amended with the failure log before any code change is attempted; per the prompt's stop conditions, "Node 22 requires non-trivial code changes" is itself a stop signal.

## 7. Non-goals

- ❌ No `package.json` change. `engines.node: ">=20"` already covers Node 22; no `engines` widening or narrowing was needed.
- ❌ No `package-lock.json` change. The dependency graph is unchanged — `npm ci` on Node 22 reads the same lockfile.
- ❌ No `npm publish`, no `npm version`, no `npm dist-tag` change, no `latest` promotion.
- ❌ No git tag, no GitHub release.
- ❌ No `README.md` / `docs/quickstart.md` / `docs/mcp-usage.md` change. Claude Desktop validation status (DEC-017) unchanged. Cursor and Cline remain unverified.
- ❌ No new MCP tool, no MCP allowlist change.
- ❌ No source code change.
- ❌ No test change. (The previous PR #34 hardened the only test that could have been a Node-22 risk; this PR adds Node 22 to the matrix without further test-side adjustments.)
- ❌ No Windows / macOS expansion. Multi-OS is a separate later DEC, likely at GA.
- ❌ No new workflow file. Single existing workflow modified.
- ❌ No claim that Cursor or Cline is verified.

## 8. Follow-up

- **Observe the first 3–5 matrix runs.** A single green pair on this PR is necessary but not sufficient to declare the matrix stable — flakes are statistical. Across the next handful of PRs, both `build (node 20)` and `build (node 22)` cells should be watched for asymmetric flakiness.
- **If Node 22 flakes:** inspect the cell's logs first. Do not change source code based on a single Node-22 failure; rerun once to filter transient infrastructure noise (the same protocol used after the lock-observability flake on PR #33). Persistent failures justify a focused-fix PR with its own report, not an inline patch in this PR.
- **DEC-018 remaining prerequisites** (continue in any convenient order):
  - Host support boundary DEC (Claude Desktop only or also Cursor / Cline).
  - Examples F2 / F3.
  - `npm install -g o-coding-navigation@alpha` smoke evidence.
  - `latest`-tag strategy DEC.
  - Doc audit for accidental beta language.
  - Beta promotion DEC (final gate).
- **Multi-OS expansion** stays gated on a separate DEC, almost certainly at GA. This PR deliberately stops at the minimum DEC-018 prescribed (Node 20 + Node 22).
