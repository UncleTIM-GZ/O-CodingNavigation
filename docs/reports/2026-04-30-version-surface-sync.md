# Version Surface Sync (P1-004)｜版本面同步

> Date: 2026-04-30
> Audit reference: `docs/reports/2026-04-30-post-alpha-codex-audit.md` §3 P1-004
> Caveat: External MCP Host Validation pending. PR D not started, no real Claude Desktop / Cursor / Cline verification has been performed.

---

## 1. Summary

Closes P1-004 from the post-alpha Codex audit. CLI `--version` and MCP server metadata previously embedded the literal `0.0.1-alpha.0` while the published npm package was `0.1.0-alpha.1`. Both surfaces now read from a single runtime-derived source that tracks `package.json`. A regression test pins the surfaces to the manifest so any future divergence fails CI.

```
ocn --version              before: 0.0.1-alpha.0   after: 0.1.0-alpha.1
MCP server metadata.version before: 0.0.1-alpha.0   after: 0.1.0-alpha.1
package.json.version       unchanged: 0.1.0-alpha.1
```

No version bump, no npm publish, no dist-tag change. The "External MCP Host Validation pending" caveat is preserved.

## 2. Codex P1-004 finding (verbatim from audit report)

```
Finding:
  npm package is 0.1.0-alpha.1 but ocn --version and MCP server metadata still
  report 0.0.1-alpha.0.

Evidence:
  src/cli/index.ts:16
  src/mcp/server.ts:29
  package.json:3

Impact:
  Users and MCP hosts see stale version information. This undermines support, bug
  reports, install verification, and publish confidence. A user reporting "I am on
  0.0.1-alpha.0" is in fact on 0.1.0-alpha.1, which makes triage unreliable.

Recommendation:
  Single-source version from package metadata (read package.json at runtime, or
  inject at build time) and add a packed smoke test that asserts CLI / MCP server
  version equals package.json version.

Suggested PR:
  fix/version-surface-sync
```

## 3. Implementation

A new `src/version.ts` is the single source of truth:

```ts
const here = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(here, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
export const PACKAGE_NAME = pkg.name;
export const PACKAGE_VERSION = pkg.version;
```

Why runtime read instead of a TS-level JSON import:

- `tsconfig.build.json` sets `rootDir: "src"`, so `import pkg from "../package.json"` would emit a TS6059 "not under rootDir" error. Either we widen `rootDir` (large blast radius) or we read at runtime. Runtime read is the smaller, safer change.
- Runtime read auto-syncs when `npm version` bumps `package.json` — no follow-up source change needed.
- Path layout works for both runtime modes:
  - dev (`tsx` / `vitest`): `src/version.ts` → `${repo}/src/` → `../package.json` = `${repo}/package.json`
  - built dist: `dist/version.js` → `${install}/dist/` → `../package.json` = `${install}/package.json`
- The published npm tarball always contains `package.json` (npm forces it; `package.json.files` does not need to list it), so the relative read works for installed users too.

Wiring:

- `src/cli/index.ts` — `program.version(PACKAGE_VERSION)` (was the literal `"0.0.1-alpha.0"`).
- `src/mcp/server.ts` — exports `MCP_SERVER_DEFAULT_INFO = { name: "ocn", version: PACKAGE_VERSION }`. `createMcpServer` reads its defaults from this constant. The MCP server **name** stays `"ocn"` (protocol-level identity, deliberately separate from the npm package name `"o-coding-navigation"`); only the **version** was stale.

## 4. Version surfaces synced

| Surface | Before | After | Tested by |
| --- | --- | --- | --- |
| `package.json.version` | `0.1.0-alpha.1` | `0.1.0-alpha.1` (unchanged) | `tests/unit/version-surface.test.ts` |
| `src/version.ts` `PACKAGE_VERSION` | (did not exist) | `0.1.0-alpha.1` | `tests/unit/version-surface.test.ts` |
| `src/version.ts` `PACKAGE_NAME` | (did not exist) | `o-coding-navigation` | `tests/unit/version-surface.test.ts` |
| `ocn --version` (commander) | `0.0.1-alpha.0` | `0.1.0-alpha.1` | `tests/cli/version.test.ts` (spawns CLI) |
| MCP server `version` field | `0.0.1-alpha.0` | `0.1.0-alpha.1` | `tests/unit/version-surface.test.ts` (`MCP_SERVER_DEFAULT_INFO`) |
| MCP server `name` field | `ocn` | `ocn` (unchanged) | `tests/unit/version-surface.test.ts` |

## 5. Tests added

Seven new tests; full suite 417 → 424 passing, zero regressions.

`tests/unit/version-surface.test.ts` (6 tests):

- `PACKAGE_VERSION` equals `package.json.version` (re-reads manifest from disk to catch drift even if a future change reverts to a hardcoded literal).
- `PACKAGE_NAME` equals `package.json.name`.
- `PACKAGE_VERSION` matches the semver-with-prerelease shape.
- `MCP_SERVER_DEFAULT_INFO.version` equals `PACKAGE_VERSION`.
- `MCP_SERVER_DEFAULT_INFO.name` is `"ocn"` and is intentionally **distinct** from `PACKAGE_NAME` (protocol identity vs npm package name).
- Neither surface exposes the historical stale literal `"0.0.1-alpha.0"`.

`tests/cli/version.test.ts` (1 test):

- `ocn --version` prints `package.json.version` exactly. Uses the existing `spawnOcn` helper which prefers built `dist/` and falls back to `tsx`, so the test exercises whichever code path the developer or CI is running.

## 6. Local validation

```
npm run lint           PASS
npm run typecheck      PASS
npm run test           PASS (424 / 424)
npm run test:coverage  PASS — overall 83.08%; src/version.ts 100%
npm run build          PASS
node dist/cli/index.js --version  → 0.1.0-alpha.1
node_modules/.bin/tsx src/cli/index.ts --version → 0.1.0-alpha.1
```

The packed-smoke risk surface (Codex recommendation #4) is covered by the CLI test using `spawnOcn`, which exercises the built `dist/` artifact when it exists. A future PR can add a `npm pack --dry-run` based test if we want stronger end-to-end install proof, but that is out of scope here per the plan's "minimum stable change" guidance.

## 7. Non-goals (deliberately out of scope)

- No `package.json.version` bump (still `0.1.0-alpha.1`).
- No npm publish, no dist-tag changes, no `latest` promotion.
- No git tag, no GitHub release.
- No README / quickstart / mcp-usage doc changes (the published install command and version statements remain accurate; nothing about the alpha install flow changed).
- No changes to other P1 items (P1-002 / P1-003) — each gets its own PR per the audit's recommended order.
- No new MCP tools, no removed MCP tools, no `ErrorCode` enum changes.
- External MCP Host Validation remains **pending**. This PR makes the version surface honest; it does not validate against any real MCP host.
- No PR D, no beta promotion.
