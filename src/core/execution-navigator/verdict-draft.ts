// MVP 6 — verdict draft orchestrator (DEC-024 PR 7).
//
// Read-only orchestrator. Composes existing readers (local git, OCN state,
// acceptance evidence map, verification status, optional GitHub PR) into a
// deterministic evidence-derived verdict draft. No LLM, no mutation, no file
// writes, no command execution. Pure assembly: same inputs produce
// byte-identical JSON.
//
// Decision philosophy: conservative — when rules are ambiguous, default
// toward `hold-for-manual-review` or `continue-work` over `ready-to-merge`.
// The command does NOT auto-decide; it produces an auditable draft to help
// a human decide.
//
// PR-B / M2: builds a single EvidenceContext and threads it into the
// verify-status orchestrator so the GitHub PR is fetched at most once. PR-B
// / M5: rules and assembly helpers live in sibling modules.

import type { CommandResult } from "../../types/result.js";
import { blocked, ok } from "../result.js";
import { msg } from "../i18n.js";
import { summarizeVerifyStatus } from "./verify-status.js";
import {
  buildEvidenceContext,
  type EvidenceContext,
} from "./evidence-context.js";
import { defaultGhRunner, type GhRunner } from "./github-pr-runner.js";
import {
  deriveCategory,
  type VerdictInputs,
} from "./verdict-draft-rules.js";
import {
  buildEvidenceSourcesUsed,
  buildInputs,
  collectBlocks,
  collectRiskFlags,
  collectSupports,
  collectWarnings,
  deriveConfidence,
  deriveHumanReviewRequired,
} from "./verdict-draft-assembly.js";
import type {
  VerdictDraftData,
  VerdictDraftMode,
  VerdictDraftVerdict,
} from "./types.js";
import {
  HEADLINE_EN,
  HEADLINE_ZH,
  NEXT_ACTION,
  SUMMARY,
  VERDICT_DRAFT_COMMAND_ID,
} from "./verdict-draft-constants.js";

export interface VerdictDraftOptions {
  readonly cwd: string;
  readonly mode: VerdictDraftMode;
  readonly prNumber?: number;
  readonly runner?: GhRunner;
  // Optional pre-built EvidenceContext (PR-B / M2).
  readonly context?: EvidenceContext;
}

// Re-export internal types for tests / future consumers that previously
// reached into verdict-draft for these.
export { deriveCategory } from "./verdict-draft-rules.js";
export { deriveConfidence } from "./verdict-draft-assembly.js";

export async function generateVerdictDraft(
  opts: VerdictDraftOptions,
): Promise<CommandResult<VerdictDraftData>> {
  // Build the EvidenceContext once and reuse it for verify-status. Without
  // this, verify-status would re-fetch the same PR, doubling round-trips.
  const ctx =
    opts.context ??
    (await buildEvidenceContext({
      cwd: opts.cwd,
      mode: opts.mode,
      prNumber: typeof opts.prNumber === "number" ? opts.prNumber : null,
      ghRunner: opts.runner ?? defaultGhRunner(),
    }));

  const verifyResult = await summarizeVerifyStatus({
    cwd: opts.cwd,
    mode: opts.mode,
    ...(opts.prNumber !== undefined ? { prNumber: opts.prNumber } : {}),
    ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
    context: ctx,
  });
  if (verifyResult.ok !== true || verifyResult.data === undefined) {
    return blocked<VerdictDraftData>(
      "ERR_IO_OR_CONFIG",
      verifyResult.message ?? msg("Verify-status failed.", "验证状态汇总失败。"),
      {
        command: VERDICT_DRAFT_COMMAND_ID,
        implemented: true,
        noMutation: true,
        reason: "verify-status-failed",
      },
    );
  }

  const verify = verifyResult.data;
  const hasPr = verify.pr !== null;
  const prProvided = typeof opts.prNumber === "number" && opts.mode !== "local";
  const githubUnavailable =
    prProvided && verify.warnings.some((w) => w.startsWith("github-evidence-unavailable"));

  const verdictInputs: VerdictInputs = {
    mode: opts.mode,
    verify,
    hasPr,
    prProvided,
    githubUnavailable,
    verifyWarnings: verify.warnings,
  };

  const category = deriveCategory(verdictInputs);
  const riskFlags = collectRiskFlags(verdictInputs);
  const confidence = deriveConfidence(category, verdictInputs, riskFlags.length);
  const supports = collectSupports(verdictInputs);
  const blocks = collectBlocks(verdictInputs);
  const warnings = collectWarnings(verdictInputs);
  const humanReviewRequired = deriveHumanReviewRequired(category, confidence);

  const verdict: VerdictDraftVerdict = {
    category,
    confidence,
    summary: SUMMARY[category],
    supports,
    blocks,
    humanReviewRequired,
    nextSuggestedAction: NEXT_ACTION[category],
  };

  const data: VerdictDraftData = {
    command: VERDICT_DRAFT_COMMAND_ID,
    implemented: true,
    noMutation: true,
    mode: opts.mode,
    evidenceSourcesUsed: buildEvidenceSourcesUsed(verdictInputs),
    verdict,
    inputs: buildInputs(verdictInputs),
    riskFlags,
    warnings,
  };

  return ok(msg(HEADLINE_EN, HEADLINE_ZH), data);
}
