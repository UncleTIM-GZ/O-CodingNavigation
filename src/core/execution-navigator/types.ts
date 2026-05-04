// Execution Navigator command surface (DEC-024).
//
// PR 1 ships a typed command skeleton only — no GitHub API, no git read,
// no CI ingestion, no file creation, no project-state mutation. Each command
// returns a structured "planned / not-implemented-yet" envelope so AI agents
// and humans can discover the navigator surface without it pretending to do
// real evidence work.

// Stable string command IDs. These are part of the public Execution
// Navigator contract (DEC-024) and must not be renamed without a Decision Log
// entry — see CLAUDE.md §4.2.
export type ExecutionNavigatorCommand =
  | "exec.status"
  | "github.analyze_pr"
  | "evidence.map"
  | "next_prompt"
  | "verify.status"
  | "verdict.draft";

// Evidence sources the navigator will eventually read from. v1.0 deliberately
// keeps the universe small and observable.
export type EvidenceSource = "git" | "github" | "ci";

// Skeleton response payload. The shape is stable across all six commands so
// downstream callers (CLI text renderer, MCP server, agents) can branch on a
// single discriminator (`command`) plus a single boolean (`implemented`).
export interface ExecutionNavigatorSkeletonData {
  readonly command: ExecutionNavigatorCommand;
  readonly status: "planned";
  readonly implemented: false;
  readonly evidenceSourcesPlanned: readonly EvidenceSource[];
  readonly nextImplementation: string;
  readonly noMutation: true;
}
