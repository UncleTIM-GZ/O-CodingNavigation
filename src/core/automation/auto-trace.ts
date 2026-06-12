import { promises as fs } from "node:fs";
import { AuditEvent } from "../../types/audit.js";
import type { CommandResult } from "../../types/result.js";
import { AuditPaths } from "../audit/audit-paths.js";
import { msg } from "../i18n.js";
import { ok } from "../result.js";

// AM-009 — `ocn auto trace`: the replay view (decision-trace layer 3).
// Pull-mode (no audit write, §4.7): filters the continuous audit JSONL down
// to the automation storyline — every ai_agent event (advance / task check /
// milestone rewind, each carrying rationale + machine context) plus the
// auto_mode_changed switch/suspend events. The JSONL spans all rounds
// (DEC-033 ruling ③), so the trace replays the whole project history.

export const DEFAULT_TRACE_LIMIT = 50;

export interface TraceEntry {
  readonly timestamp: string;
  readonly eventType: string;
  readonly result: string;
  readonly actor: string;
  readonly stepId: string | null;
  readonly rationale: string | null;
  readonly data: unknown;
}

export interface AutoTracePayload {
  readonly entries: readonly TraceEntry[];
  readonly totalMatched: number;
}

function isAutomationEvent(event: AuditEvent): boolean {
  return event.actor === "ai_agent" || event.eventType === "auto_mode_changed";
}

function toEntry(event: AuditEvent): TraceEntry {
  const data = event.data as Record<string, unknown> | undefined;
  const rationale = typeof data?.["rationale"] === "string" ? (data["rationale"] as string) : null;
  return {
    timestamp: event.timestamp,
    eventType: event.eventType,
    result: event.result,
    actor: event.actor,
    stepId: event.currentStepId ?? null,
    rationale,
    data: event.data ?? null,
  };
}

export async function autoTrace(
  cwd: string,
  limit: number = DEFAULT_TRACE_LIMIT,
): Promise<CommandResult<AutoTracePayload>> {
  let text: string;
  try {
    text = await fs.readFile(AuditPaths.jsonlFile(cwd), "utf8");
  } catch {
    return ok(
      msg("No audit trail yet — nothing to trace.", "尚无审计日志——没有可复盘的记录。"),
      { entries: [], totalMatched: 0 },
    );
  }

  const matched: TraceEntry[] = [];
  for (const line of text.split("\n")) {
    if (line.trim().length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue; // tolerate a torn tail line
    }
    const event = AuditEvent.safeParse(parsed);
    if (event.success && isAutomationEvent(event.data)) matched.push(toEntry(event.data));
  }

  const entries = matched.slice(-Math.max(1, limit));
  return ok(
    msg(
      `Automation trace: ${entries.length} of ${matched.length} event(s) (newest last). Each ai_agent event carries the rationale and engine-recorded context.`,
      `自动化复盘：共 ${matched.length} 条，显示最近 ${entries.length} 条（最新在后）。每条 ai_agent 事件附带决策理由与引擎记录的机器上下文。`,
    ),
    { entries, totalMatched: matched.length },
  );
}
