// PR-B / M5 — shared types between next-prompt orchestrator and section
// builders. Avoids a circular import.

import type { TaskLedger } from "../../types/task.js";
import type { AutomationStatusView } from "../automation/governance-text.js";
import type { OutcomeDispatch } from "./next-prompt-outcome-dispatch.js";
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
  /** SOP 0.5.0 (AM-007 / DEC-032) — task ledger for BUILD-state dispatch.
   *  Absent/null → legacy prompt behavior, byte-for-byte. */
  readonly taskLedger?: TaskLedger | null;
  /** AM-009 — auto-mode status. Absent / fully-off → legacy prompt,
   *  byte-for-byte. Active → appends the "## Automation loop" section. */
  readonly automation?: AutomationStatusView;
  /** SOP 0.9.0 (AM-017 / DEC-043) §E.1 — a due-but-unmeasured outcome AC to
   *  dispatch (`ocn outcome check`). Absent → legacy prompt, byte-for-byte. */
  readonly outcomeDispatch?: OutcomeDispatch;
}
