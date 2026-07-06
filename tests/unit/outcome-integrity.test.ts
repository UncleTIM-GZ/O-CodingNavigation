import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { reconcileLedgerWithAudit } from "../../src/core/outcome/outcome-integrity.js";
import {
  reconcileFrozenContracts,
  readOutcomeLedger,
  writeOutcomeLedger,
} from "../../src/core/outcome/outcome-ledger-store.js";
import { Paths } from "../../src/core/paths.js";
import { AuditPaths } from "../../src/core/audit/audit-paths.js";
import type { AcceptanceSpecV2 } from "../../src/types/acceptance-spec.js";
import { measureOnce } from "./outcome-measure-helper.js";

// SOP 0.9.0 (AM-016) P2 — reconcile the ledger against the CHAINED, never-
// archived outcome_measured audit subset. The chain is the trust root; the
// ledger is the attacker-editable projection.

const spec = (command: string): AcceptanceSpecV2 => ({
  kind: "outcome",
  id: "AC-P-1",
  desc: "d",
  trace: [],
  measure: {
    command,
    threshold: { op: ">=", value: 1 },
    source: "dist/**",
    due: "state_ship",
    timeoutSeconds: 5,
  },
});

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(join(tmpdir(), "ocn-integ-"));
  await fs.mkdir(join(root, ".ocoding", "audit"), { recursive: true });
  await writeOutcomeLedger(root, reconcileFrozenContracts([spec("node probe.js")], null)!);
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function measure(value: number): Promise<void> {
  await measureOnce(root, "AC-P-1", {
    verdict: value >= 1 ? "MEASURED_PASS" : "MEASURED_FAIL",
    value,
    command: "node probe.js",
    evidenceHash: "b".repeat(64),
  });
}

describe("reconcileLedgerWithAudit", () => {
  it("consistent ledger + audit → null (no breach)", async () => {
    await measure(0);
    await measure(5);
    expect(await reconcileLedgerWithAudit(root, [spec("node probe.js")])).toBeNull();
  });

  it("hand-edited ledger value → field_mismatch breach", async () => {
    await measure(5);
    const led = await readOutcomeLedger(root);
    led!.entries[0]!.history[0]!.value = 999; // forge a passing number
    await fs.writeFile(Paths.outcomeLedgerFile(root), JSON.stringify(led, null, 2));
    const breach = await reconcileLedgerWithAudit(root, [spec("node probe.js")]);
    expect(breach?.kind).toBe("field_mismatch");
  });

  it("ledger holds a measurement absent from audit → ledger_ahead breach", async () => {
    await measure(5);
    const led = await readOutcomeLedger(root);
    const forged = {
      ...led!.entries[0]!.history[0]!,
      measurementId: "01BX5ZZKBKACTAV9WEVGEMMVRZ",
      value: 999,
    };
    led!.entries[0]!.history.push(forged);
    await fs.writeFile(Paths.outcomeLedgerFile(root), JSON.stringify(led, null, 2));
    const breach = await reconcileLedgerWithAudit(root, [spec("node probe.js")]);
    expect(breach?.kind).toBe("ledger_ahead");
  });

  it("audit ahead of ledger by one (crash before rename) → recoverable, not breach", async () => {
    await measure(5);
    // Simulate a crash: append another chained audit event but roll the ledger
    // back to just the first measurement.
    const ledBefore = await readOutcomeLedger(root);
    const firstOnly = JSON.parse(JSON.stringify(ledBefore));
    await measure(3); // writes both audit + ledger
    await fs.writeFile(Paths.outcomeLedgerFile(root), JSON.stringify(firstOnly, null, 2)); // ledger regressed
    expect(await reconcileLedgerWithAudit(root, [spec("node probe.js")])).toBeNull();
  });

  it("contract hash drift (docs/03 command changed) → contract_drift breach", async () => {
    await measure(5);
    const breach = await reconcileLedgerWithAudit(root, [spec("node probe2.js")]);
    expect(breach?.kind).toBe("contract_drift");
  });

  it("broken audit chain (deleted interior event) → chain_broken breach", async () => {
    await measure(0);
    await measure(5);
    const jsonl = AuditPaths.jsonlFile(root);
    const lines = (await fs.readFile(jsonl, "utf8")).split("\n").filter((l) => l.trim());
    const outcomeIdx = lines
      .map((l, i) => ({ l, i }))
      .filter((x) => JSON.parse(x.l).eventType === "outcome_measured")
      .map((x) => x.i);
    lines.splice(outcomeIdx[0]!, 1); // delete the first outcome event → chain breaks
    await fs.writeFile(jsonl, lines.join("\n") + "\n");
    const breach = await reconcileLedgerWithAudit(root, [spec("node probe.js")]);
    expect(breach?.kind).toBe("chain_broken");
  });
});
