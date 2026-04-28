// PR #5 §3 — decouple safeAudit from process.stderr to keep MCP stdio
// transport clean. CLI keeps writing to stderr (default); MCP entry switches
// to silent at startup so audit failures never pollute the JSON-RPC stream.
//
// This module is a process-global mutable seam: a single setter swaps the
// active logger. Tests must reset to the stderr default in afterEach to
// avoid cross-test interference.

export interface AuditFallbackLogger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Default — used by the CLI. Writes a single newline-terminated line per call. */
export const stderrAuditFallbackLogger: AuditFallbackLogger = {
  warn(message) {
    process.stderr.write(`audit: ${message}\n`);
  },
  error(message) {
    process.stderr.write(`audit: ${message}\n`);
  },
};

/** Used by the MCP server. Drops messages on the floor; safe under stdio. */
export const silentAuditFallbackLogger: AuditFallbackLogger = {
  warn() {
    /* intentionally silent */
  },
  error() {
    /* intentionally silent */
  },
};

let activeLogger: AuditFallbackLogger = stderrAuditFallbackLogger;

export function setAuditFallbackLogger(logger: AuditFallbackLogger): void {
  activeLogger = logger;
}

export function getAuditFallbackLogger(): AuditFallbackLogger {
  return activeLogger;
}

/** Test helper: restore the stderr default. Call from `afterEach` in any
 *  test that swaps the logger to silent. */
export function resetAuditFallbackLogger(): void {
  activeLogger = stderrAuditFallbackLogger;
}
