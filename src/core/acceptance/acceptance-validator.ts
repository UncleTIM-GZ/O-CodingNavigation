import type { BilingualMessage } from "../../types/i18n.js";
import { msg } from "../i18n.js";
import type { AcceptanceDefect } from "./acceptance-spec-parser.js";

// SOP 0.8.0 (AM-015 / DEC-041) — bilingual, human-readable rendering of one
// acceptance-spec defect (mirrors task-validator.describeTaskDefect). The
// acceptance defect taxonomy is currently structural-only (produced by the
// parser); this module is the seam where any future referential checks
// (e.g. trace → requirement ids) and their descriptions would live.

export function describeAcceptanceDefect(defect: AcceptanceDefect): BilingualMessage {
  const id = defect.specId ?? "";
  switch (defect.code) {
    case "no_specs":
      return msg(
        "Acceptance Specs section has no spec blocks — acceptance criteria were never defined in machine-parseable form",
        "Acceptance Specs 章节没有验收块——验收标准从未以机器可解析形式定义",
      );
    case "duplicate_id":
      return msg(`duplicate acceptance id: ${id}`, `验收 id 重复：${id}`);
    case "invalid_id":
      return msg(
        `invalid acceptance id "${id}" (must match AC-<DOMAIN>-<n>)`,
        `验收 id 非法："${id}"（必须匹配 AC-<域>-<编号>）`,
      );
    case "missing_field":
      return msg(
        `acceptance ${id} is missing required field: ${defect.field ?? ""}`,
        `验收 ${id} 缺少必填字段：${defect.field ?? ""}`,
      );
    case "invalid_kind":
      return msg(
        `acceptance ${id} has an unknown kind "${defect.field ?? ""}" (must be build or outcome)`,
        `验收 ${id} 的 kind 非法："${defect.field ?? ""}"（必须为 build 或 outcome）`,
      );
    case "missing_measure_field":
      return msg(
        `outcome acceptance ${id} is missing required measurement field: ${defect.field ?? ""}`,
        `效果型验收 ${id} 缺少必填测量字段：${defect.field ?? ""}`,
      );
    case "invalid_threshold":
      return msg(
        `outcome acceptance ${id} has an invalid threshold: ${defect.field ?? ""}`,
        `效果型验收 ${id} 的阈值非法：${defect.field ?? ""}`,
      );
    case "invalid_due":
      return msg(
        `outcome acceptance ${id} has an invalid measure.due (must be a state id): ${defect.field ?? ""}`,
        `效果型验收 ${id} 的 measure.due 非法（必须是状态 id）：${defect.field ?? ""}`,
      );
    case "invalid_timeout":
      return msg(
        `outcome acceptance ${id} has an invalid measure.timeout (integer 1–600): ${defect.field ?? ""}`,
        `效果型验收 ${id} 的 measure.timeout 非法（1–600 的整数）：${defect.field ?? ""}`,
      );
  }
}
