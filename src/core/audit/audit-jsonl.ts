import { promises as fs } from "node:fs";
import type { AuditEvent } from "../../types/audit.js";
import { AuditPaths } from "./audit-paths.js";

/**
 * Append a single AuditEvent line to .ocoding/audit/audit-events.jsonl.
 *
 * Atomicity: relies on POSIX O_APPEND (Linux/macOS) and Windows
 * FILE_APPEND_DATA semantics — a single fs.appendFile call writes the
 * entire buffer in one underlying syscall, so concurrent appends on the
 * same host do not interleave bytes within a line. This holds for buffers
 * within a filesystem page (typically 4096 bytes); we enforce a 3500-byte
 * conservative cap to stay safely under that boundary.
 *
 * NOT guaranteed on networked filesystems (NFS/SMB across hosts). OCN is
 * local-first; cross-host concurrent writes are out of scope.
 *
 * Plan §15.1 captures the assumption.
 */

export const MAX_AUDIT_LINE_BYTES = 3500;

export class AuditEventTooLargeError extends Error {
  constructor(public readonly actualBytes: number) {
    super(
      `AuditEvent line is ${actualBytes} bytes, exceeds limit of ${MAX_AUDIT_LINE_BYTES}. ` +
        "Trim the 'data' field or split the event.",
    );
    this.name = "AuditEventTooLargeError";
  }
}

export async function appendAuditJsonl(
  root: string,
  event: AuditEvent,
): Promise<void> {
  const target = AuditPaths.jsonlFile(root);
  const line = JSON.stringify(event) + "\n";
  const size = Buffer.byteLength(line, "utf8");
  if (size > MAX_AUDIT_LINE_BYTES) {
    throw new AuditEventTooLargeError(size);
  }
  await fs.mkdir(AuditPaths.auditDir(root), { recursive: true });
  await fs.appendFile(target, line, "utf8");
}
