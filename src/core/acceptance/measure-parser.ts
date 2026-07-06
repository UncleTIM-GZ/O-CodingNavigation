import type { AcceptanceKind, MeasureContract } from "../../types/outcome.js";
import { parseThreshold } from "../outcome/threshold.js";
import type { AcceptanceDefect } from "./acceptance-spec-parser.js";

// SOP 0.9.0 (AM-017) — outcome `kind` + measurement-contract parsing, split out
// of acceptance-spec-parser so both stay under the 300-line limit. PURE: operates
// on an already-collected field map, pushes structural defects, no IO.

type Fields = ReadonlyMap<string, string>;

const STATE_ID_RE = /^state_[a-z0-9_]+$/;
const MEASURE_REQUIRED: readonly string[] = [
  "measure.command",
  "measure.threshold",
  "measure.source",
];

export function hasAnyMeasureField(fields: Fields): boolean {
  for (const key of fields.keys()) {
    if (key.startsWith("measure.")) return true;
  }
  return false;
}

// `kind` defaults to build; an unrecognised value is a blocking defect (guarding
// the discriminant) rather than a silent downgrade that would drop the contract.
export function resolveKind(
  fields: Fields,
  displayId: string,
  defects: AcceptanceDefect[],
): AcceptanceKind {
  const raw = (fields.get("kind") ?? "").trim().toLowerCase();
  if (raw.length === 0 || raw === "build") return "build";
  if (raw === "outcome") return "outcome";
  defects.push({ code: "invalid_kind", specId: displayId, field: raw });
  return "build";
}

// Absent → undefined (contract default applies). Present-but-invalid (non-integer,
// ≤0, >600) → an invalid_timeout defect + undefined (the gate then blocks).
function parseTimeoutSeconds(
  raw: string,
  displayId: string,
  defects: AcceptanceDefect[],
): number | undefined {
  if (raw.length === 0) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 600) {
    defects.push({ code: "invalid_timeout", specId: displayId, field: raw });
    return undefined;
  }
  return value;
}

// Builds the measurement contract for an outcome AC, emitting one defect per
// structural problem. Returns undefined when any measure defect fired (the gate
// blocks on any defect, so a partial contract is never surfaced downstream).
export function buildMeasure(
  fields: Fields,
  displayId: string,
  defects: AcceptanceDefect[],
): MeasureContract | undefined {
  const get = (key: string): string => (fields.get(key) ?? "").trim();
  const before = defects.length;

  for (const field of MEASURE_REQUIRED) {
    if (get(field).length === 0) {
      defects.push({ code: "missing_measure_field", specId: displayId, field });
    }
  }

  const thresholdRaw = get("measure.threshold");
  const parsed = thresholdRaw.length > 0 ? parseThreshold(thresholdRaw) : undefined;
  if (parsed !== undefined && !parsed.ok) {
    defects.push({
      code: "invalid_threshold",
      specId: displayId,
      field: parsed.reason ?? "invalid threshold",
    });
  }
  const threshold = parsed?.ok === true ? parsed.threshold : undefined;

  const due = get("measure.due");
  if (due.length > 0 && !STATE_ID_RE.test(due)) {
    defects.push({ code: "invalid_due", specId: displayId, field: due });
  }

  const timeoutSeconds = parseTimeoutSeconds(get("measure.timeout"), displayId, defects);

  // Any measure defect (delta) blocks; threshold === undefined also narrows the type.
  if (defects.length !== before || threshold === undefined) return undefined;
  return {
    command: get("measure.command"),
    threshold,
    source: get("measure.source"),
    due: due.length > 0 ? due : "state_ship",
    timeoutSeconds: timeoutSeconds ?? 60,
  };
}
