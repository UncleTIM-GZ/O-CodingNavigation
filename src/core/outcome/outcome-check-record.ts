import { ulid } from "ulid";
import type { AuditResult } from "../../types/audit.js";
import type { BilingualMessage } from "../../types/i18n.js";
import type {
  EvidenceFile,
  OutcomeMeasuredData,
  OutcomeMeasurement,
  OutcomeVerdict,
} from "../../types/outcome-ledger.js";
import { nowIsoUtc } from "../time.js";

// SOP 0.9.0 (AM-016) — pure record-assembly + messaging for `ocn outcome check`,
// split out to keep the orchestrator under the 300-line hard limit. No IO.

export function auditResultFor(verdict: OutcomeVerdict): AuditResult {
  switch (verdict) {
    case "MEASURED_PASS":
      return "pass";
    case "MEASURED_FAIL":
      return "failed";
    case "NO_EVIDENCE":
      return "no_evidence";
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

export interface Assembled {
  readonly measurement: OutcomeMeasurement;
  readonly auditData: OutcomeMeasuredData;
}

export interface AssembleInput {
  readonly acId: string;
  readonly seq: number;
  readonly prevEventHash: string;
  readonly verdict: OutcomeVerdict;
  readonly value: number | null;
  readonly commandHash: string;
  readonly evidenceHash: string;
  readonly evidenceFiles: readonly EvidenceFile[];
  readonly probeEntryHash: string;
  readonly durationMs: number;
}

/** Build the paired ledger measurement + audit payload (shared measurementId). */
export function assembleMeasurement(input: AssembleInput): Assembled {
  const measurementId = ulid();
  const auditData: OutcomeMeasuredData = {
    acId: input.acId,
    measurementId,
    seq: input.seq,
    verdict: input.verdict,
    value: input.value,
    commandHash: input.commandHash,
    probeEntryHash: input.probeEntryHash,
    evidenceHash: input.evidenceHash,
    prevEventHash: input.prevEventHash,
  };
  const measurement: OutcomeMeasurement = {
    measuredAt: nowIsoUtc(),
    seq: input.seq,
    verdict: input.verdict,
    value: input.value,
    commandHash: input.commandHash,
    probeEntryHash: input.probeEntryHash,
    evidenceHash: input.evidenceHash,
    evidenceFiles: [...input.evidenceFiles],
    durationMs: input.durationMs,
    measurementId,
  };
  return { measurement, auditData };
}

/** Honest verdict message: forgery-EVIDENT, not forgery-proof (declared boundary). */
export function outcomeMessage(
  acId: string,
  verdict: OutcomeVerdict,
  value: number | null,
  probeEntryHash: string,
  rationale: string | undefined,
): BilingualMessage {
  const v = value === null ? "∅" : String(value);
  const note = probeEntryHash === "" ? " (probe program not snapshotted)" : "";
  const noteZh = probeEntryHash === "" ? "（未快照探针程序）" : "";
  const r = rationale !== undefined ? ` [rationale: ${rationale}]` : "";
  return {
    en: `${acId}: ${verdict} (value=${v})${note}. Forgery-evident, not forgery-proof — measurement is cross-checked against the chained audit log.${r}`,
    zh: `${acId}：${verdict}（value=${v}）${noteZh}。伪造必留痕（非密码学防伪）——测量已与链式审计日志交叉核对。${r}`,
  };
}
