---
status: pending
priority: p3
issue_id: 007
tags: [code-review, security, ci, supply-chain]
dependencies: []
---

# Pin GitHub Actions to commit SHAs (supply-chain hardening)

## Problem Statement

`.github/workflows/ci.yml` references `actions/checkout@v4` and `actions/setup-node@v4` and `actions/upload-artifact@v4`. Tag references can be silently moved by malicious or compromised tags. Pinning to commit SHAs removes that risk.

This is a LOW-severity hardening — there are no untrusted inputs in the workflow today, and the org is not a high-value target. Spike-acceptable to defer, but the fix is cheap.

## Findings

- `.github/workflows/ci.yml:19` — `actions/checkout@v4`
- `.github/workflows/ci.yml:20` — `actions/setup-node@v4`
- `.github/workflows/ci.yml:38` — `actions/upload-artifact@v4`
- Source: security-sentinel review, item #8 (LOW).

## Proposed Solutions

### Option A — Pin to commit SHA with comment

```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.7
- uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
- uses: actions/upload-artifact@604373da6381bf24206979c74d06a550515601b9  # v4.4.1
```

- Pros: immutable; safe against tag-moves.
- Cons: manual updates needed; consider Dependabot.

### Option B — Defer to Phase 2

- Pros: no churn now.
- Cons: any compromise upstream becomes a real risk.

**Recommended: Option A** + add Dependabot config for automated SHA bumps.

## Technical Details

- Affected files: `.github/workflows/ci.yml`, optional `.github/dependabot.yml`.

## Acceptance Criteria

- [ ] Each `uses:` line in `ci.yml` is `<owner>/<repo>@<sha>` with a `# v…` comment.
- [ ] Optional: `.github/dependabot.yml` configured for `github-actions` ecosystem with weekly cadence.

## Work Log

(empty — pending triage)

## Resources

- PR #1 — Skeleton Spike
- security-sentinel review item #8
- https://docs.github.com/en/actions/learn-github-actions/using-pre-written-building-blocks-in-your-workflow#using-shas
