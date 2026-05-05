// PR-B / M5 — shared types between next-prompt orchestrator and section
// builders. Avoids a circular import.

import type {
  AcceptanceParseResult,
  EvidenceMapMappingData,
  ExecStatusGitData,
  ExecStatusOcnData,
  GitHubPrAnalyzeData,
  NextPromptAgent,
  NextPromptMode,
} from "./types.js";

// Slice of NextPromptOptions that the assembler reads.
export interface NextPromptOptionsSlice {
  readonly agent: NextPromptAgent;
  readonly mode: NextPromptMode;
  readonly prNumber?: number;
}

export interface PromptInputs {
  readonly opts: NextPromptOptionsSlice;
  readonly git: ExecStatusGitData;
  readonly ocn: ExecStatusOcnData;
  readonly acceptance: AcceptanceParseResult;
  readonly mapping: EvidenceMapMappingData;
  readonly github: GitHubPrAnalyzeData | null;
  readonly githubRequested: boolean;
  readonly githubUnavailable: boolean;
  readonly issueText: string | null;
  readonly issueTruncated: boolean;
  readonly smokeAvailable: boolean;
  readonly warnings: readonly string[];
}
