import { promises as fs } from "node:fs";
import { Paths } from "../paths.js";
import { checkCurrentArtifact } from "../check.js";
import { readState } from "../state/state-store.js";
import { isStopped } from "../stop/stopped.js";

// AM-006 / DEC-031 — Claude Code Stop-hook engine. Called (via `ocn hook
// stop`) when the agent tries to end its turn: re-runs the OCN gate and, if
// blocked, feeds the bilingual fix hints back so the agent keeps working.
// Contract notes (verified against the Claude Code hooks doc):
//   - input payload carries `stop_hook_active: true` when a previous block
//     from this hook is already being processed — we MUST allow then,
//     otherwise the session loops forever;
//   - blocking is expressed by the CALLER printing
//     `{"decision":"block","reason":...}` on stdout and exiting 0.
// Policy: FAIL-OPEN — a broken hook must never wedge the user's session;
// `ocn check` remains the authoritative verdict.

export interface StopHookOutcome {
  readonly action: "allow" | "block";
  /** Present when action === "block" — bilingual, truncated. */
  readonly reason?: string;
  /** One-line stderr warning on the fail-open path. */
  readonly warning?: string;
}

export interface StopHookOptions {
  readonly cwd: string;
  readonly payload: Record<string, unknown> | null;
}

const SEGMENT_MAX = 700;
const TRAILER =
  "Fix the issues above, then end the turn again — or hand back to the human.｜修复后重试，或交还人工处理。";

function truncateSegment(text: string): string {
  if (text.length <= SEGMENT_MAX) return text;
  return `${text.slice(0, SEGMENT_MAX - 1)}…`;
}

function buildBlockReason(en: string, zh: string): string {
  return [
    `OCN gate blocked: ${truncateSegment(en)}`,
    `OCN 门禁未通过：${truncateSegment(zh)}`,
    TRAILER,
  ].join("\n");
}

async function stateFileExists(cwd: string): Promise<boolean> {
  try {
    await fs.access(Paths.stateFile(cwd));
    return true;
  } catch {
    return false;
  }
}

export async function runStopHook(opts: StopHookOptions): Promise<StopHookOutcome> {
  // Loop protection: a prior block from this hook is already in flight.
  if (opts.payload?.["stop_hook_active"] === true) {
    return { action: "allow" };
  }
  // Not an OCN project (or not initialized) — never interfere.
  if (!(await stateFileExists(opts.cwd))) {
    return { action: "allow" };
  }
  // `ocn stop` — the project is terminated: never force the AI to keep going.
  // On any read failure, fall through to the check below (which keeps the
  // authoritative fail-open warning path).
  try {
    if (isStopped(await readState(opts.cwd))) return { action: "allow" };
  } catch {
    // fall through
  }
  try {
    const result = await checkCurrentArtifact({ cwd: opts.cwd });
    if (result.ok) return { action: "allow" };
    return {
      action: "block",
      reason: buildBlockReason(result.message.en, result.message.zh),
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      action: "allow",
      warning: `ocn hook stop: check could not run (${detail}); allowing stop｜检查无法执行，已放行。`,
    };
  }
}
