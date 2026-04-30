import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
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
 * Materialise the markdown header at `file`. After this call returns, `file`
 * exists with the FULL header content — never with partial bytes, never with
 * an empty placeholder.
 *
 * Algorithm (DEC-014): write the header to a unique tmp file first, then
 * atomically `link()` the tmp into place. `link(2)` is a single atomic
 * filesystem syscall that either creates a hard link to a fully-populated
 * inode (success) or fails with EEXIST (another writer raced first — their
 * link already references the inode with the full header). Either way, after
 * this call, every observer sees `file` with full header content.
 *
 * Why not `fs.open(file, "wx") + handle.writeFile(header)`? That approach
 * (the previous implementation, see DEC-013 history) creates an empty file
 * via `O_CREAT|O_EXCL` and THEN writes the header through the handle. The
 * gap between create and write is observable to a concurrent writer, who
 * sees EEXIST, falls through to `fs.appendFile`, and writes their event
 * section at offset 0 — only to be overwritten by the first writer's header
 * write. The link approach closes that gap because the destination only
 * ever appears after the source is fully written.
 *
 * Why not `fs.writeFile(file, header, { flag: "wx" })`? Internally that is
 * still open + write + close as separate libuv work items. A concurrent
 * writer's open(wx) returns EEXIST after the first writer's open creates
 * the empty file, before the first writer's write completes. Same race.
 */
async function ensureMarkdownHeader(file: string): Promise<void> {
  // Fast path: the file already exists with a fully-populated header (set by
  // a previous successful call). Skip the link dance.
  try {
    await fs.access(file);
    return;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Slow path: write the header to a unique tmp file, then atomically link.
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, MARKDOWN_HEADER, "utf8");
  try {
    await fs.link(tmp, file);
  } catch (err) {
    // EEXIST means another writer linked their tmp into place first; their
    // link references an inode with the full header content, so we can
    // safely fall through and append our event section.
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  } finally {
    // Always remove our tmp. If link() succeeded, our tmp was the source;
    // unlinking it removes the original directory entry but `file` (the
    // hardlink target) keeps the inode alive. If link() failed (EEXIST),
    // tmp is just a leftover header file we no longer need.
    try {
      await fs.unlink(tmp);
    } catch {
      /* swallow — tmp may already be gone, or unlinkable */
    }
  }
}

/**
 * Append an audit event section to docs/22-audit-trail.md.
 *
 * First-write race avoidance (DEC-014): see `ensureMarkdownHeader`. After
 * the header materialises atomically, every event section appends with
 * O_APPEND, which the kernel serialises atomically (each fs.appendFile is
 * a single write(2) ≤ PIPE_BUF for our section sizes ~500 bytes). No
 * sleep, no retry, no in-process lock.
 */
export async function appendAuditMarkdown(root: string, event: AuditEvent): Promise<void> {
  const file = AuditPaths.markdownFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  await ensureMarkdownHeader(file);
  await fs.appendFile(file, renderMarkdownSection(event), "utf8");
}
