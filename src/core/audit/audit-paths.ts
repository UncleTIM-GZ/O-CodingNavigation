import { join } from "node:path";

// PR #3 §15.1 — paths follow user spec verbatim (`audit/`, `22-audit-trail.md`).
// Amendment Needed: docs/05-data-model.md uses `events/` and `21-audit-trail.md`.
// See implementation-notes.md §10.

export const AuditPaths = {
  auditDir: (root: string): string => join(root, ".ocoding", "audit"),
  jsonlFile: (root: string): string => join(root, ".ocoding", "audit", "audit-events.jsonl"),
  markdownFile: (root: string): string => join(root, "docs", "22-audit-trail.md"),
} as const;
