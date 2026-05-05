// MVP 4 — deterministic agent prompt orchestrator (DEC-024 PR 5).
//
// Read-only. Composes existing readers (local git, OCN state, acceptance map,
// optional GitHub PR analysis) into a deterministic markdown prompt body.
// Pure assembly: same inputs → byte-identical prompt string. No LLM, no
// network call, no mutation, no file writes.
//
// PR-B / M2: takes an optional `EvidenceContext` so callers that already
// composed one can avoid duplicate I/O. PR-B / M5: section builders live in
// `next-prompt-assemble.ts`.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../../types/result.js";
import { ok } from "../result.js";
import { msg } from "../i18n.js";
import {
  buildEvidenceContext,
  type EvidenceContext,
} from "./evidence-context.js";
import { mapEvidence } from "./evidence-map.js";
import { defaultGhRunner, type GhRunner } from "./github-pr-runner.js";
import {
  ISSUE_TEXT_MAX_LENGTH,
  NEXT_PROMPT_HEADLINE_EN,
  NEXT_PROMPT_HEADLINE_ZH,
} from "./next-prompt-templates.js";
import {
  assemblePrompt,
  buildSummary,
  type PromptInputs,
} from "./next-prompt-assemble.js";
import type {
  EvidenceSourceUsed,
  NextPromptAgent,
  NextPromptData,
  NextPromptMode,
} from "./types.js";

const SMOKE_SCRIPT_PATH = "examples/plan-to-verify/scripts/smoke.sh";

export interface NextPromptOptions {
  readonly cwd: string;
  readonly agent: NextPromptAgent;
  readonly mode: NextPromptMode;
  readonly issue?: string;
  readonly prNumber?: number;
  readonly runner?: GhRunner;
  // Optional pre-built EvidenceContext (PR-B / M2).
  readonly context?: EvidenceContext;
}

async function smokeScriptExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(join(cwd, SMOKE_SCRIPT_PATH));
    return true;
  } catch {
    return false;
  }
}

function normaliseIssue(raw: string | undefined): {
  readonly text: string | null;
  readonly truncated: boolean;
} {
  if (typeof raw !== "string") return { text: null, truncated: false };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { text: null, truncated: false };
  if (trimmed.length > ISSUE_TEXT_MAX_LENGTH) {
    return { text: trimmed.slice(0, ISSUE_TEXT_MAX_LENGTH), truncated: true };
  }
  return { text: trimmed, truncated: false };
}

function buildEvidenceSourcesUsed(
  hasGithub: boolean,
  acceptanceFound: boolean,
): readonly EvidenceSourceUsed[] {
  const out: EvidenceSourceUsed[] = ["local-git", "ocn-state"];
  if (acceptanceFound) out.push("acceptance-map");
  if (hasGithub) out.push("github");
  return out;
}

export async function generateNextPrompt(
  opts: NextPromptOptions,
): Promise<CommandResult<NextPromptData>> {
  const issue = normaliseIssue(opts.issue);
  const warnings: string[] = [];
  if (issue.truncated) {
    warnings.push(`issue text truncated to ${ISSUE_TEXT_MAX_LENGTH} chars`);
  }

  const ctx =
    opts.context ??
    (await buildEvidenceContext({
      cwd: opts.cwd,
      // next-prompt historically uses combined-mode semantics — fetch PR
      // whenever a number is supplied. mode === "review" / "fix" / etc are
      // prompt-shape modes, not evidence-mode modes.
      mode: typeof opts.prNumber === "number" ? "combined" : "local",
      prNumber: typeof opts.prNumber === "number" ? opts.prNumber : null,
      ghRunner: opts.runner ?? defaultGhRunner(),
    }));

  // Forward github-evidence-unavailable warnings only — keep historical shape.
  for (const w of ctx.warnings) {
    if (w.startsWith("github-evidence-unavailable")) warnings.push(w);
  }

  const githubRequested = typeof opts.prNumber === "number";
  const mapping = mapEvidence({
    criteria: ctx.acceptance.criteria,
    git: ctx.git,
    github: ctx.github,
  });

  const smokeAvailable = await smokeScriptExists(opts.cwd);

  const input: PromptInputs = {
    opts: {
      agent: opts.agent,
      mode: opts.mode,
      ...(opts.prNumber !== undefined ? { prNumber: opts.prNumber } : {}),
    },
    git: ctx.git,
    ocn: ctx.ocn,
    acceptance: ctx.acceptance,
    mapping,
    github: ctx.github,
    githubRequested,
    githubUnavailable: ctx.githubUnavailable,
    issueText: issue.text,
    issueTruncated: issue.truncated,
    smokeAvailable,
    warnings,
  };

  const { prompt, riskFlags } = assemblePrompt(input);
  const summary = buildSummary(input, riskFlags);
  const evidenceSourcesUsed = buildEvidenceSourcesUsed(
    ctx.github !== null,
    ctx.acceptance.found,
  );

  const data: NextPromptData = {
    command: "next_prompt",
    implemented: true,
    noMutation: true,
    agent: opts.agent,
    mode: opts.mode,
    evidenceSourcesUsed,
    summary,
    prompt,
    warnings,
  };

  return ok(msg(NEXT_PROMPT_HEADLINE_EN, NEXT_PROMPT_HEADLINE_ZH), data);
}
