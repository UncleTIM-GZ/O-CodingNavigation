# Post-alpha Codex Full-repo Audit｜alpha 后 Codex 全仓库审计

> Date: 2026-04-30
> Auditor: Codex CLI 0.125.0 (`/codex:review` via codex-companion shared runtime)
> Scope: read-only full-repo audit of `main` after `0.1.0-alpha.1` npm publish
> Caveat: External MCP Host Validation pending (PR D not started, no real Claude Desktop / Cursor / Cline verification has been performed)

---

## 1. Executive Summary

```
Verdict: Conditional — current alpha.1 can remain public as a limited experimental alpha,
         but beta promotion must not start.
P0 findings: 0
P1 findings: 4
P2 findings: 6
P3 findings: 2
External MCP Host Validation pending.
```

Bottom line:

- **alpha.1 can remain public** as a limited, experimental alpha for early adopters who already accept the "External MCP Host Validation pending" caveat.
- **PR D should wait** until at least P1-001 (MCP mutation boundary) and P1-004 (version surface) are fixed; ideally all four P1 items are fixed before any real-host validation work starts, otherwise the host validation will be testing a known-stale and known-unsafe surface.
- **Beta promotion must not start.** The four P1 items are correctness / safety / contract issues that the beta gate cannot tolerate.

This report is **planning input only**. No src, no tests, no package metadata, no publish, no dist-tag changes are made by this PR.

---

## 2. Release Surface Reviewed

```
Package:               o-coding-navigation
Repo version:          0.1.0-alpha.1
npm alpha tag:         0.1.0-alpha.1
npm latest tag:        0.1.0-alpha.0
Install command:       npm install -g o-coding-navigation@alpha
MCP Host validation:   pending
```

Local baseline checks captured at audit time:

| Check | Result |
| --- | --- |
| `git status --short` on `main` | clean |
| `package.json` name | `o-coding-navigation` |
| `package.json` version | `0.1.0-alpha.1` |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test` | PASS (394 tests / 63 files) |
| `npm run test:coverage` | PASS — stmt 83.45% / branch 85.06% / func 90.76% / line 83.45% |
| `npm run build` | PASS |

Notable coverage low-points (see §6):

- `src/mcp/server.ts` — **0%**
- `src/mcp/index.ts` — **0%**
- `src/core/security/project-root.ts` — 75.55%
- `src/core/sop/detect-version.ts` — 70.83%
- `src/core/log/capture-log.ts` — 81.63%

---

## 3. P1 Findings

Four P1 findings — must-fix before beta. Each is a code-level correctness / safety / public-contract issue, not just polish.

### P1-001｜MCP mutating tools do not require initialized OCN project

```
Finding:
  navigator.create_artifact validates projectRoot as an absolute existing directory,
  but does not require the directory to be an initialized OCN project.

Evidence:
  src/core/security/project-root.ts:48
  src/mcp/tools/create-artifact.ts:21

Impact:
  A real MCP host could write OCN artifacts into arbitrary absolute directories such as
  /, $HOME, or unrelated repositories, as long as projectRoot passes the current
  directory validation. This breaks the MCP threat model assumption that mutating tools
  only act inside an initialized OCN project.

Recommendation:
  Mutating MCP tools must require an initialized OCN project, likely by requiring
  .ocoding/state.json and SOP metadata to exist and validate before writes. Read-only
  tools must have a clearly defined behaviour for non-initialized roots
  (structured error or explicit limited diagnostic).

Suggested PR:
  fix/mcp-mutating-tools-require-initialized-project
```

### P1-002｜`ocn check` is still hard-coded to `step_prd`

```
Finding:
  ocn check still assumes step_prd rather than checking the current step generically.

Evidence:
  src/core/check.ts:29
  README.md:160

Impact:
  For steps other than PRD, check may return ERR_STATE_MACHINE while docs imply
  current-step checking. The CLI surface is dishonest about what it actually does and
  fails for the very first step (state_discovery / step_project_brief).

Recommendation:
  Make checkCurrentArtifact current-step aware, using state.json + SOP loader to
  resolve the current artifact and required sections. Alternatively, narrow the public
  command surface (deprecate / remove until generalized) and update docs accordingly.

Suggested PR:
  fix/check-current-step-generic
```

### P1-003｜Persisted SOP snapshot does not match runtime profile

```
Finding:
  ocn init persists a minimal/skeleton SOP YAML while the runtime loader exposes a
  DISCOVERY → PLAN multi-step profile. The persisted snapshot only contains
  state_spec / step_prd shaped data, but loader.ts surfaces many more states/steps.

Evidence:
  src/core/init.ts:97
  src/core/sop/loader.ts:15
  src/sops/default-ai-coding-sop/0.1.0/sop.ts:3
  src/sops/default-ai-coding-sop/0.1.0/artifacts.ts:1
  src/sops/default-ai-coding-sop/0.1.0/gates.ts:1

Impact:
  detect_sop_version may not catch divergence between persisted project SOP and
  runtime behaviour. This undermines SOP trust, profile upgrade semantics, and any
  downstream tooling that reads .ocoding/sop.yaml as the source of truth.

Recommendation:
  Make persisted SOP snapshot and runtime SOP profile consistent — generate persisted
  YAML from the same authoritative step map — or clearly define runtime-profile
  override semantics with explicit detection. Test parity between persisted snapshot
  and runtime loader.

Suggested PR:
  fix/sync-persisted-sop-snapshot-with-runtime-profile
```

### P1-004｜Version surface is stale

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

---

## 4. P2 Findings

Six P2 findings — should-fix before beta. Each is documented but not implemented in this PR.

### P2-001｜doc/log writes have no lock, but `docs/mcp-usage.md` claims locking

```
Finding:
  Mutating MCP file writes (create_artifact, capture_log) are not lock-backed, even
  though docs/mcp-usage.md says they are. create_artifact also uses a stat-then-
  writeFile pattern with a TOCTOU window.

Impact:
  Concurrent MCP agents can race on artifact / log creation, and the docs currently
  overstate safety. Audit attribution can also drift away from the stronger
  state.json safety guarantees.

Recommendation:
  Either add lock + atomic semantics for doc/log writes (mirroring state.json)
  or narrow the guarantee in docs/mcp-usage.md.

Suggested PR:
  fix/mcp-doc-log-locking-and-attribution (combined with P2-004)
```

### P2-002｜MCP error codes are inconsistent with documented `ERR_VALIDATION` contract

```
Finding:
  Different MCP tools convert input parse failures into different exit codes
  (ERR_IO_OR_CONFIG / ERR_GATE_FAILED / ERR_ARTIFACT_INVALID / ERR_SOP_VERSION),
  while docs/mcp-usage.md promises ERR_VALIDATION.

Impact:
  Host-side automation cannot rely on consistent machine error semantics. Hosts that
  branch on error code will misroute failures.

Recommendation:
  Normalize Zod / input validation failures to a single documented code (either
  introduce ERR_VALIDATION as a stable code, or update docs to match what tools
  actually emit). Add cross-tool envelope tests.

Suggested PR:
  fix/mcp-validation-error-contract
```

### P2-003｜quickstart teaches users to write H1 while gate accepts H2/H3

```
Finding:
  docs/quickstart.md walks users through creating a PRD with H1 required-section
  headings, but the gate matcher only accepts H2/H3.

Impact:
  Users following the published guide can create artifacts that fail the gate, even
  though the artifact looks correct by the docs. This is a high-friction first
  experience for a quickstart.

Recommendation:
  Fix docs to use ## headings, or relax the matcher to also accept H1 (with documented
  trade-offs around heading hierarchy noise).

Suggested PR:
  docs/quickstart-heading-fix (rolled into docs sweep)
```

### P2-004｜MCP `create_artifact` audit attribution says `actor=user`, `source=cli`

```
Finding:
  MCP create_artifact events are attributed as human CLI actions because core/doc.ts
  hard-codes actor=user, source=cli, command=doc.create, and the MCP handler cannot
  override them.

Impact:
  Audit trail is not fully trustworthy about who performed an action. A real MCP
  host writing artifacts will appear in audit logs as a human CLI user.

Recommendation:
  Thread actor / source / command through createArtifact so MCP handlers can attribute
  events as actor=ai, source=mcp, command=navigator.create_artifact.

Suggested PR:
  fix/mcp-doc-log-locking-and-attribution (combined with P2-001)
```

### P2-005｜BUILD/VERIFY/SHIP/REFLECT are unreachable, while README implies 8-state full flow

```
Finding:
  The repo markets an 8-state forward workflow (DISCOVERY → SPEC → DESIGN → PLAN →
  BUILD → VERIFY → SHIP → REFLECT), but BUILD / VERIFY / SHIP / REFLECT are
  unreachable because they have no steps and nextStep is built only from the
  flattened step list.

Impact:
  Beta promotion would overclaim workflow completeness. Users can never advance past
  PLAN with the current SOP profile.

Recommendation:
  Either wire explicit stub steps for the four trailing states, or narrow the public
  positioning before beta to make the partial scope explicit.

Suggested PR:
  feat/sop-stub-steps-or-narrow-positioning
```

### P2-006｜README/quickstart/publish report contain stale wording

```
Finding:
  README and quickstart still describe alpha.0-era state in places, including
  "not yet on npm" wording, alpha.0 versions, and the old `latest` tag explanation.
  docs/reports/2026-04-30-npm-alpha-1-publish-report.md still references stale
  decision log paths.

Impact:
  The npm package ships these stale docs in its tarball, so external users see
  misleading operational guidance.

Recommendation:
  Do a truthfulness sweep before the next publish: README, docs/quickstart.md,
  docs/mcp-usage.md, publish reports. Audit for stale doc/19-decision-log.md vs
  docs/20-decision-log.md references and stale audit-events path references.

Suggested PR:
  docs/post-alpha-truthfulness-sweep
```

---

## 5. P3 Findings

```
P3-001 status / where_am_i docs mention last gate result + locked SOP, but
       the implementation does not expose them. Minor doc/API drift.
P3-002 sop-loader tests assert the skeleton YAML string, which masks P1-003
       rather than catching it. Tests should assert parity with runtime step map.
```

These are polish / maintainability items. They do not block alpha or beta on their own, but P3-002 should be folded into the P1-003 fix to prevent regression.

---

## 6. Test Coverage Gaps

```
- mcp/server.ts and mcp/index.ts coverage is 0%.
- No version-surface regression test (CLI/MCP version vs package.json version).
- No MCP create_artifact negative test for uninitialized directories.
- No create_artifact / capture_log concurrency or lock test.
- ocn check tests seed step_prd only, masking P1-002.
- CI runs Node 20 only; Node 22 matrix is still pending.
```

These gaps are part of why the four P1 items survived to alpha.1. The P1 fix train should expand the test matrix as it lands, not after.

---

## 7. Security Review

### Threat: MCP host writes into arbitrary absolute directory

```
Threat:              malicious / misconfigured MCP host points create_artifact at /,
                     $HOME, or an unrelated repo
Current mitigation:  projectRoot must be absolute, existing, a directory, and pass
                     realpath validation
Remaining risk:      initialized-project check missing for mutating MCP tools — the
                     directory does not have to be an OCN project
Recommendation:      P1-001 fix/mcp-mutating-tools-require-initialized-project
```

### Threat: stale version surface

```
Threat:              users / MCP hosts report or trust the wrong version, undermining
                     support, bug triage, and publish verification
Current mitigation:  package.json and npm registry are correct
Remaining risk:      CLI (ocn --version) and MCP server metadata embed 0.0.1-alpha.0
Recommendation:      P1-004 fix/version-surface-sync (with packed smoke test)
```

### Threat: stale SOP snapshot

```
Threat:              persisted .ocoding/sop.yaml does not match runtime SOP profile;
                     downstream tooling that reads the snapshot is misled
Current mitigation:  runtime loader works correctly and is the authoritative source
                     during a session
Remaining risk:      persisted snapshot is the human-readable governance artifact and
                     also the input to detect_sop_version, but it lies about scope
Recommendation:      P1-003 fix/sync-persisted-sop-snapshot-with-runtime-profile
```

### Threat: doc/log race + stdio pollution (lower)

```
Threat:              concurrent MCP agents race on doc/log writes; stderr writes
                     pollute MCP stdio framing
Current mitigation:  state-write path is lock-protected; safeAudit fallback exists
Remaining risk:      doc/log mutations are outside the same safety model; some audit
                     warnings may be silently dropped in MCP mode
Recommendation:      P2-001 / P2-004 (combined PR after P1 train)
```

---

## 8. Documentation Consistency Review

The "External MCP Host Validation pending" caveat **remains correct** and must remain in the docs and release notes.

Docs must NOT claim:

- real Claude Desktop compatibility
- Cursor compatibility
- Cline compatibility
- beta readiness
- "real host validation complete"

There are stale-docs risks that we are recording but **not fixing in this PR**:

- README "not yet on npm" residual wording
- quickstart H1 example (P2-003)
- mcp-usage.md ERR_VALIDATION promise (P2-002)
- mcp-usage.md lock guarantee (P2-001)
- references to `docs/19-decision-log.md` / `docs/21-audit-trail.md` instead of `docs/20-decision-log.md` / `docs/22-audit-trail.md`
- references to `.ocoding/events/audit-events.jsonl` if any remain

These fold into PR 6 (docs truthfulness sweep). They are P2, not blockers for alpha.1 remaining public.

---

## 9. Package / npm Review

```
alpha.1 can remain the current public alpha.
npm install -g o-coding-navigation@alpha resolves to fixed alpha.1.
latest remains alpha.0 by design under DEC-015.
Do not promote latest without a new DEC.
```

Confirmed positive surface points:

- `files` allowlist is tight
- `prepublishOnly` runs full lint/typecheck/test/build
- bins (`ocn`, `ocn-mcp`) are executable with shebangs
- `engines.node` is declared
- tarball ships intended files only

The only material npm-surface risks are the dist-tag pinning policy (intentional, documented in DEC-015) and the stale shipped docs (P2-006 sweep).

---

## 10. Recommended PR Order

```
PR 1: fix/mcp-mutating-tools-require-initialized-project
      Priority: P1
      Must before beta: yes
      Blocks: PR D, beta

PR 2: fix/version-surface-sync + packed smoke test
      Priority: P1
      Must before beta: yes
      Blocks: next alpha publish / user support

PR 3: fix/check-current-step-generic
      Priority: P1
      Must before beta: yes
      Blocks: CLI truthfulness

PR 4: fix/sync-persisted-sop-snapshot-with-runtime-profile
      Priority: P1
      Must before beta: yes
      Blocks: SOP trust

PR 5: doc/log locking + MCP audit attribution
      Priority: P2

PR 6: docs truthfulness sweep
      Priority: P2

PR 7: MCP validation/error contract standardization
      Priority: P2

PR 8: validation matrix expansion: Node 22 + MCP server/index coverage
      Priority: P2
```

Any of PR 1–PR 4 may justify a `0.1.0-alpha.2` patch publish; that decision is deferred to a future DEC.

---

## 11. Final Recommendation

```
Can alpha.1 remain public alpha?
  Yes, conditionally. Keep all current caveats. Do not actively recommend to
  external MCP hosts until P1-001 and P1-004 are fixed at minimum.

Can PR D proceed now?
  Not recommended. Fix P1-001 and P1-004 first at minimum; ideally all P1.
  Real-host validation against a known-stale and known-unsafe surface is wasted
  effort.

Can beta promotion start now?
  No. All four P1 items must land first, and the docs truthfulness sweep should
  ride alongside the publish that promotes from alpha to beta.

Next safest action:
  Start PR 1 — fix/mcp-mutating-tools-require-initialized-project.
  Plan in docs/plans/2026-04-30-fix-mcp-mutating-tools-require-initialized-project-plan.md
```
