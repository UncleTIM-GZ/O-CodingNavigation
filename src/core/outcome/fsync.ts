import { promises as fs } from "node:fs";
import { AuditPaths } from "../audit/audit-paths.js";

// SOP 0.9.0 (AM-016) — durability barrier (DI-H5). Force the appended
// outcome_measured event to disk BEFORE the ledger rename, so a power-loss
// can't persist the ledger while losing the audit line (= a false "ledger
// ahead of audit" tamper signal on an honest crash).
export async function fsyncAuditJsonl(root: string): Promise<void> {
  const fh = await fs.open(AuditPaths.jsonlFile(root), "r");
  try {
    await fh.sync();
  } finally {
    await fh.close();
  }
}
