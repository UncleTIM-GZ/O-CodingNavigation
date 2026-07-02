import { ulid } from "ulid";
import { appendAuditJsonl } from "../../src/core/audit/audit-jsonl.js";
import { createAuditEvent } from "../../src/core/audit/audit-event.js";
import { lastOutcomeEventHash } from "../../src/core/outcome/outcome-integrity.js";
import { appendMeasurement } from "../../src/core/outcome/outcome-ledger-store.js";
import { verifyHashOf } from "../../src/core/task/task-ledger-store.js";
import { msg } from "../../src/core/i18n.js";
import { nowIsoUtc } from "../../src/core/time.js";
import type { OutcomeVerdict } from "../../src/types/outcome-ledger.js";

// Test double for the command's dual-write: appends a real chained
// outcome_measured audit event + the ledger measurement, so integrity tests
// exercise the true chain rather than a fabricated one.

export interface MeasureInput {
  readonly verdict: OutcomeVerdict;
  readonly value: number | null;
  readonly command: string;
  readonly evidenceHash: string;
  readonly probeEntryHash?: string;
}

const resultFor = (v: OutcomeVerdict): "pass" | "failed" | "no_evidence" =>
  v === "MEASURED_PASS" ? "pass" : v === "MEASURED_FAIL" ? "failed" : "no_evidence";

export async function measureOnce(root: string, acId: string, input: MeasureInput): Promise<string> {
  const commandHash = verifyHashOf(input.command);
  const probeEntryHash = input.probeEntryHash ?? "";
  const measurement = await appendMeasurement(
    root,
    acId,
    async ({ seq, prevEventHash }) => {
      const measurementId = ulid();
      return {
        measurement: {
          measuredAt: nowIsoUtc(),
          seq,
          verdict: input.verdict,
          value: input.value,
          commandHash,
          probeEntryHash,
          evidenceHash: input.evidenceHash,
          evidenceFiles: [],
          durationMs: 0,
          measurementId,
        },
        auditData: {
          acId,
          measurementId,
          seq,
          verdict: input.verdict,
          value: input.value,
          commandHash,
          probeEntryHash,
          evidenceHash: input.evidenceHash,
          prevEventHash,
        },
      };
    },
    async (auditData) => {
      await appendAuditJsonl(
        root,
        createAuditEvent({
          eventType: "outcome_measured",
          result: resultFor(input.verdict),
          actor: "user",
          source: "test",
          projectRoot: root,
          message: msg("m", "m"),
          data: auditData,
        }),
      );
    },
    () => lastOutcomeEventHash(root),
  );
  return measurement.measurementId;
}
