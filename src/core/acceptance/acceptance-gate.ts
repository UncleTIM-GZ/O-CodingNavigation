import type { AcceptanceProjection } from "../../types/acceptance-spec.js";
import type { BilingualMessage } from "../../types/i18n.js";
import { msg } from "../i18n.js";
import { parseAcceptanceSpecs, type AcceptanceDefect } from "./acceptance-spec-parser.js";
import { parsedAcceptanceToSpec } from "./acceptance-source.js";
import { buildAcceptanceProjection, sha256Hex } from "./acceptance-spec-store.js";
import { describeAcceptanceDefect } from "./acceptance-validator.js";

// SOP 0.8.0 (AM-015 / DEC-041) — Acceptance Backbone gate orchestration, used
// by the gate runner on step_acceptance_criteria (after the section gate).
// Mirrors evaluateTaskSpecs + the projection-write discipline: structural
// defects block with ERR_ARTIFACT_INVALID; on pass the projection (the frozen
// machine source of AC ids for build-plan traces) is returned for the runner
// to persist. PURE — no IO; the runner owns the write.

const MAX_DEFECTS_IN_MESSAGE = 6;

export interface AcceptanceGateOutcome {
  readonly ok: boolean;
  readonly message: BilingualMessage;
  readonly blockingReasons?: readonly string[];
  readonly issues?: readonly AcceptanceDefect[];
  readonly projection?: AcceptanceProjection;
}

function composeBlockedMessage(defects: readonly AcceptanceDefect[]): BilingualMessage {
  const shown = defects.slice(0, MAX_DEFECTS_IN_MESSAGE);
  const more = defects.length - shown.length;
  const en = shown.map((d) => describeAcceptanceDefect(d).en).join("; ");
  const zh = shown.map((d) => describeAcceptanceDefect(d).zh).join("；");
  const moreEn = more > 0 ? ` (+${more} more)` : "";
  const moreZh = more > 0 ? `（另有 ${more} 项）` : "";
  return msg(`Acceptance Specs have defects: ${en}${moreEn}`, `验收规格存在缺陷：${zh}${moreZh}`);
}

export function evaluateAcceptanceSpecs(
  content: string,
  // AC-16 — true only for a 0.9.0+ pin. Threaded into the projection builder so
  // a <0.9.0 project with `kind:outcome` in docs gets a v1 projection + a warn
  // (never a v2 freeze).
  outcomeCapable = true,
): AcceptanceGateOutcome {
  const parsed = parseAcceptanceSpecs(content);
  if (parsed.defects.length > 0) {
    return {
      ok: false,
      message: composeBlockedMessage(parsed.defects),
      blockingReasons: ["acceptance_spec_defects"],
      issues: parsed.defects,
    };
  }
  const specs = parsed.specs.map(parsedAcceptanceToSpec);
  const projection = buildAcceptanceProjection(
    specs,
    sha256Hex(parsed.sectionText ?? ""),
    outcomeCapable,
  );
  const downgradedOutcome = !outcomeCapable && specs.some((s) => s.kind === "outcome");
  const warn = downgradedOutcome
    ? msg(
        " (outcome AC require SOP 0.9.0 — recorded as ordinary AC; run `ocn sop upgrade` to activate the Outcome Backbone)",
        "（outcome 验收项需 SOP 0.9.0——已按普通验收项登记；执行 `ocn sop upgrade` 激活结果主干）",
      )
    : msg("", "");
  return {
    ok: true,
    message: msg(
      `Acceptance Specs validated (${specs.length} spec(s); frozen to projection).${warn.en}`,
      `验收规格校验通过（${specs.length} 条；已冻结至投影）。${warn.zh}`,
    ),
    projection,
  };
}
