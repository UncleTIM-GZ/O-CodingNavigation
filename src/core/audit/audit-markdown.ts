import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { AuditEvent } from "../../types/audit.js";
import { AuditPaths } from "./audit-paths.js";

const MARKDOWN_HEADER = `# Audit Trail｜审计链

> Append-only. Each H2 below is one AuditEvent. The HTML comment carries
> machine-readable metadata; the body carries the human-readable bilingual
> message and any related paths or artifact ids.
>
> The machine source of truth is \`.ocoding/audit/audit-events.jsonl\`.

`;

function renderMetaBlock(event: AuditEvent): string {
  const lines: string[] = [
    "<!-- ocn-event",
    `eventId: ${event.eventId}`,
    `eventType: ${event.eventType}`,
    `result: ${event.result}`,
    `source: ${event.source}`,
    `actor: ${event.actor}`,
  ];
  if (event.currentStateId !== undefined) {
    lines.push(`currentStateId: ${event.currentStateId}`);
  }
  if (event.currentStepId !== undefined) {
    lines.push(`currentStepId: ${event.currentStepId}`);
  }
  if (event.command !== undefined) {
    lines.push(`command: ${event.command}`);
  }
  lines.push("-->");
  return lines.join("\n");
}

export function renderMarkdownSection(event: AuditEvent): string {
  const parts: string[] = [];
  parts.push(`## ${event.timestamp}｜${event.eventType}`);
  parts.push("");
  parts.push(renderMetaBlock(event));
  parts.push("");
  parts.push(event.message.zh);
  parts.push(event.message.en);
  if (event.relatedPaths !== undefined && event.relatedPaths.length > 0) {
    parts.push("");
    parts.push("Related paths:");
    for (const p of event.relatedPaths) parts.push(`- ${p}`);
  }
  if (event.relatedArtifactIds !== undefined && event.relatedArtifactIds.length > 0) {
    parts.push("");
    parts.push("Related artifact ids:");
    for (const id of event.relatedArtifactIds) parts.push(`- ${id}`);
  }
  parts.push("");
  parts.push("");
  return parts.join("\n");
}

/**
 * Append an audit event section to docs/22-audit-trail.md.
 *
 * First-write race avoidance (plan §15.4): use exclusive create (`fs.open(_, "wx")`)
 * for the header. EEXIST means another writer already created the file — fall
 * through to the body append. This guarantees exactly one header line under
 * concurrent first-writes.
 */
export async function appendAuditMarkdown(
  root: string,
  event: AuditEvent,
): Promise<void> {
  const file = AuditPaths.markdownFile(root);
  await fs.mkdir(dirname(file), { recursive: true });

  try {
    const handle = await fs.open(file, "wx");
    try {
      await handle.writeFile(MARKDOWN_HEADER, "utf8");
    } finally {
      await handle.close();
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    // Another writer created the file; skip the header and append the body.
  }

  await fs.appendFile(file, renderMarkdownSection(event), "utf8");
}
