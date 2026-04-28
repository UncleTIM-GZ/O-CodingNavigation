import type { AuditEvent } from "../../types/audit.js";
import { appendAuditJsonl } from "./audit-jsonl.js";
import { appendAuditMarkdown } from "./audit-markdown.js";

export interface WriteAuditEventResult {
  readonly jsonlOk: boolean;
  readonly markdownOk: boolean;
  readonly warning?: string;
}

/**
 * Orchestrate the dual-track audit write. Plan §3.4:
 *   - JSONL is source of truth; if it fails, do NOT write markdown and let
 *     the caller decide (typically `safeAudit` swallows + warns at command
 *     boundary).
 *   - Markdown is best-effort; if it fails AFTER JSONL succeeded, return a
 *     warning instead of throwing — JSONL already committed the event.
 */
export async function writeAuditEvent(
  root: string,
  event: AuditEvent,
): Promise<WriteAuditEventResult> {
  await appendAuditJsonl(root, event); // throws on failure — caller catches
  try {
    await appendAuditMarkdown(root, event);
    return { jsonlOk: true, markdownOk: true };
  } catch (err) {
    return {
      jsonlOk: true,
      markdownOk: false,
      warning: `audit markdown failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Best-effort audit emission used by core commands. Never throws; never
 * affects the command's CommandResult. On failure, writes a `audit:` prefixed
 * warning to stderr and returns silently.
 */
export async function safeAudit(root: string, event: AuditEvent): Promise<void> {
  try {
    const result = await writeAuditEvent(root, event);
    if (result.warning !== undefined) {
      process.stderr.write(`audit: ${result.warning}\n`);
    }
  } catch (err) {
    process.stderr.write(
      `audit: failed to record ${event.eventType}: ${(err as Error).message}\n`,
    );
  }
}
