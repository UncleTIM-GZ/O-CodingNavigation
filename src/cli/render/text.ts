import type { CommandResult } from "../../types/result.js";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

function formatBilingual(en: string, zh: string, locale: "zh" | "en"): string {
  return locale === "zh" ? `${zh}\n${en}` : `${en}\n${zh}`;
}

function appendStatusBlock(out: string[], data: Record<string, unknown>): void {
  if (typeof data["currentStateId"] === "string") {
    out.push(`Current State: ${data["currentStateId"]}`);
  }
  if (typeof data["currentStepId"] === "string") {
    out.push(`Current Step:  ${data["currentStepId"]}`);
  }
  if (typeof data["currentArtifactPath"] === "string") {
    out.push(`Current Artifact: ${data["currentArtifactPath"]}`);
  }
  if (typeof data["nextAction"] === "string") {
    out.push(`Next Action: ${data["nextAction"]}`);
  }
  if (isRecord(data["project"])) {
    const p = data["project"];
    if (typeof p["name"] === "string" && typeof p["projectId"] === "string") {
      out.unshift(`Project: ${p["name"]} (${p["projectId"]})`);
    }
    if (typeof p["tier"] === "string") {
      out.splice(1, 0, `Tier: ${p["tier"]}`);
    }
    if (typeof p["sopProfileId"] === "string" && typeof p["sopProfileVersion"] === "string") {
      out.splice(2, 0, `SOP Profile: ${p["sopProfileId"]}@${p["sopProfileVersion"]}`);
    }
  }
}

// SOP 0.3.0 — renders the logic-backbone summary (execution order + trigger
// bindings) when the brief carries one.
function appendLogicBackboneBlock(out: string[], value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  const summary = value as Record<string, unknown>;
  const order = summary["executionOrder"];
  const triggers = summary["triggers"];
  out.push("");
  out.push("Logic Backbone｜逻辑主干:");
  if (isStringArray(order)) {
    out.push(`  Execution order: ${order.length === 0 ? "(none)" : order.join(" → ")}`);
  }
  if (isStringArray(triggers)) {
    out.push(`  Triggers: ${triggers.length === 0 ? "(none)" : triggers.join(", ")}`);
  }
}

function appendReadinessSummaryBlock(out: string[], value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  const summary = value as Record<string, unknown>;
  out.push("");
  out.push("Readiness｜角色就绪:");
  if (typeof summary["tier"] === "string" && typeof summary["counts"] === "string") {
    out.push(`  Tier ${summary["tier"]} — ${summary["counts"]}`);
  }
  if (isStringArray(summary["openItems"]) && summary["openItems"].length > 0) {
    out.push("  Open (blocks advance):");
    for (const item of summary["openItems"]) out.push(`    - ${item}`);
  }
  if (isStringArray(summary["warnings"]) && summary["warnings"].length > 0) {
    out.push("  Warnings (non-blocking):");
    for (const item of summary["warnings"]) out.push(`    - ${item}`);
  }
  if (isStringArray(summary["waivedItems"]) && summary["waivedItems"].length > 0) {
    out.push(`  Waived (ratio ${String(summary["waivedRatio"] ?? "")}):`);
    for (const item of summary["waivedItems"]) out.push(`    - ${item}`);
  }
  if (isStringArray(summary["forthcoming"]) && summary["forthcoming"].length > 0) {
    out.push("  Forthcoming｜将到期 (not yet due, non-blocking):");
    for (const item of summary["forthcoming"]) out.push(`    - ${item}`);
  }
}

// SOP 0.5.0 (AM-007) — renders the brief's task-ledger summary when present.
function appendTaskSummaryBlock(out: string[], value: unknown): void {
  if (!isRecord(value)) return;
  out.push("");
  out.push("Tasks｜任务台账:");
  out.push(
    `  done ${String(value["done"])} / pending ${String(value["pending"])} (total ${String(value["total"])})`,
  );
  if (typeof value["nextTaskId"] === "string") {
    out.push(`  Next task: ${value["nextTaskId"]} (run \`ocn task check ${value["nextTaskId"]}\`)`);
  }
}

// AM-012 — Contract Backbone coverage line in the brief.
function appendContractBlock(out: string[], value: unknown): void {
  if (!isRecord(value)) return;
  out.push("");
  out.push("Contract Backbone｜契约主干:");
  out.push(
    `  endpoints ${String(value["endpoints"])} · calls ${String(value["calls"])} · undeclared ${String(value["undeclared"])} · method-mismatch ${String(value["methodMismatch"])} · unverified ${String(value["unverified"])}`,
  );
}

// SOP 0.5.0 (AM-007) — `ocn task list` table.
function appendTaskListBlock(out: string[], data: Record<string, unknown>): void {
  const tasks = Array.isArray(data["tasks"]) ? data["tasks"] : [];
  for (const raw of tasks) {
    if (!isRecord(raw)) continue;
    const phase = typeof raw["phase"] === "string" ? ` (${raw["phase"]})` : "";
    out.push(
      `  [${String(raw["status"])}] ${String(raw["id"])}${phase} — ${String(raw["verifyCommand"])}`,
    );
  }
}

function appendReadinessListBlock(out: string[], data: Record<string, unknown>): void {
  const ledger = isRecord(data["ledger"]) ? data["ledger"] : null;
  if (ledger === null) return;
  out.push("");
  out.push(`Readiness｜角色就绪 (tier ${String(ledger["tier"])}):`);
  const checks = ledger["checks"];
  if (!Array.isArray(checks)) return;
  for (const raw of checks) {
    if (!isRecord(raw)) continue;
    const verdict = String(raw["verdict"]);
    if (verdict === "NA") continue;
    out.push(
      `  [${verdict}] ${String(raw["id"])} (${String(raw["role"])}, ${String(raw["severity"])})`,
    );
    if (verdict === "FAIL" || verdict === "UNKNOWN") {
      const hint = isRecord(raw["fixHint"]) ? raw["fixHint"] : null;
      if (hint !== null) out.push(`      → ${String(hint["zh"])}`);
    }
    // AM-014 — show a DEFERRED check's deadline ("not due until state_X").
    if (verdict === "DEFERRED" && typeof raw["detail"] === "string") {
      out.push(`      → ${raw["detail"]}`);
    }
  }
  const na = checks.filter((c) => isRecord(c) && c["verdict"] === "NA").length;
  if (na > 0) out.push(`  (+${na} not applicable at this tier)`);
}

function appendBriefBlock(out: string[], data: Record<string, unknown>): void {
  appendStatusBlock(out, data);
  if (typeof data["currentArtifactStatus"] === "string") {
    out.push(`Current Artifact Status: ${data["currentArtifactStatus"]}`);
  }
  if (typeof data["currentObjective"] === "string") {
    out.push("");
    out.push(`Current Objective: ${data["currentObjective"]}`);
  }
  if (isStringArray(data["currentBlockers"])) {
    const blockers = data["currentBlockers"];
    out.push(`Current Blockers: ${blockers.length === 0 ? "(none)" : blockers.join(", ")}`);
  }
  if (isStringArray(data["nextActions"])) {
    out.push("");
    out.push("Next Actions:");
    for (const action of data["nextActions"]) {
      out.push(`  - ${action}`);
    }
  }
  appendLogicBackboneBlock(out, data["logicBackbone"]);
  appendReadinessSummaryBlock(out, data["readiness"]);
  appendTaskSummaryBlock(out, data["tasks"]);
  appendContractBlock(out, data["contractBackbone"]);
  if (typeof data["aiGovernanceReminder"] === "string") {
    out.push("");
    out.push("AI Governance Reminder:");
    out.push(`  ${data["aiGovernanceReminder"]}`);
  }
  if (typeof data["uncertaintyPolicy"] === "string") {
    out.push("");
    out.push("Uncertainty Policy:");
    out.push(`  ${data["uncertaintyPolicy"]}`);
  }
}

function appendGithubAnalyzePrBlock(out: string[], data: Record<string, unknown>): void {
  const pr = isRecord(data["pr"]) ? data["pr"] : null;
  const changes = isRecord(data["changes"]) ? data["changes"] : null;
  const checks = isRecord(data["checks"]) ? data["checks"] : null;
  const reviews = isRecord(data["reviews"]) ? data["reviews"] : null;
  const analysis = isRecord(data["analysis"]) ? data["analysis"] : null;
  const ocn = isRecord(data["ocn"]) ? data["ocn"] : null;
  const reason = typeof data["reason"] === "string" ? data["reason"] : null;
  const prNumber = typeof data["prNumber"] === "number" ? data["prNumber"] : null;

  if (pr === null && reason !== null) {
    if (prNumber !== null) out.push(`PR: #${prNumber}`);
    out.push(`Reason: ${reason}`);
    return;
  }
  if (pr === null) return;

  const number = typeof pr["number"] === "number" ? pr["number"] : "?";
  const title = typeof pr["title"] === "string" ? pr["title"] : "";
  const state = typeof pr["state"] === "string" ? pr["state"] : "?";
  const isDraft = pr["isDraft"] === true;
  const stateLabel = isDraft ? `${state} (draft)` : state;
  out.push(`PR: #${number} ${title}`);
  out.push(`State: ${stateLabel}`);

  const author = typeof pr["author"] === "string" ? pr["author"] : "(unknown)";
  const head = typeof pr["headRefName"] === "string" ? pr["headRefName"] : "?";
  const base = typeof pr["baseRefName"] === "string" ? pr["baseRefName"] : "?";
  out.push(`Author: ${author}`);
  out.push(`Branch: ${head} -> ${base}`);

  const mergeable = typeof pr["mergeable"] === "string" ? pr["mergeable"] : "?";
  const mergeState = typeof pr["mergeStateStatus"] === "string" ? pr["mergeStateStatus"] : "?";
  out.push(`Mergeable: ${mergeable} / ${mergeState}`);

  if (changes !== null) {
    const changedFiles = typeof changes["changedFiles"] === "number" ? changes["changedFiles"] : 0;
    const additions = typeof changes["additions"] === "number" ? changes["additions"] : 0;
    const deletions = typeof changes["deletions"] === "number" ? changes["deletions"] : 0;
    out.push(`Changes: ${changedFiles} files, +${additions} -${deletions}`);
  }

  if (checks !== null) {
    const summary = typeof checks["summary"] === "string" ? checks["summary"] : "?";
    const total = typeof checks["total"] === "number" ? checks["total"] : 0;
    const passed = typeof checks["passed"] === "number" ? checks["passed"] : 0;
    const failed = typeof checks["failed"] === "number" ? checks["failed"] : 0;
    const pending = typeof checks["pending"] === "number" ? checks["pending"] : 0;
    out.push(
      `Checks: ${summary} (total ${total}, passed ${passed}, failed ${failed}, pending ${pending})`,
    );
  }

  if (reviews !== null) {
    const total = typeof reviews["total"] === "number" ? reviews["total"] : 0;
    const approved = typeof reviews["approved"] === "number" ? reviews["approved"] : 0;
    const cr = typeof reviews["changesRequested"] === "number" ? reviews["changesRequested"] : 0;
    const commented = typeof reviews["commented"] === "number" ? reviews["commented"] : 0;
    out.push(
      `Reviews: total ${total}, approved ${approved}, changes-requested ${cr}, commented ${commented}`,
    );
  }

  if (analysis !== null && isStringArray(analysis["riskFlags"])) {
    const flags = analysis["riskFlags"];
    if (flags.length > 0) {
      const top = flags.slice(0, 3).join(", ");
      out.push(`Risk flags: ${top}${flags.length > 3 ? ` (+${flags.length - 3} more)` : ""}`);
    }
  }

  if (ocn !== null && ocn["isOcnProject"] === true) {
    const stateId = typeof ocn["currentStateId"] === "string" ? ocn["currentStateId"] : "?";
    const stepId = typeof ocn["currentStepId"] === "string" ? ocn["currentStepId"] : "?";
    out.push(`OCN: ${stateId} / ${stepId}`);
  }

  if (analysis !== null && typeof analysis["nextSuggestedAction"] === "string") {
    out.push("");
    out.push(`Next: ${analysis["nextSuggestedAction"]}`);
  }
}

function appendEvidenceMapBlock(out: string[], data: Record<string, unknown>): void {
  const acceptance = isRecord(data["acceptance"]) ? data["acceptance"] : null;
  const mapping = isRecord(data["mapping"]) ? data["mapping"] : null;
  const analysis = isRecord(data["analysis"]) ? data["analysis"] : null;

  if (acceptance !== null) {
    const count = typeof acceptance["criteriaCount"] === "number" ? acceptance["criteriaCount"] : 0;
    const found = acceptance["found"] === true;
    const path = typeof acceptance["path"] === "string" ? acceptance["path"] : "?";
    out.push(`Acceptance criteria: ${count} (${found ? path : `${path} not found`})`);
  }

  if (mapping !== null) {
    const status = typeof mapping["coverageStatus"] === "string" ? mapping["coverageStatus"] : "?";
    const covered = typeof mapping["covered"] === "number" ? mapping["covered"] : 0;
    const candidate = typeof mapping["candidate"] === "number" ? mapping["candidate"] : 0;
    const missing = typeof mapping["missing"] === "number" ? mapping["missing"] : 0;
    const human = typeof mapping["needsHumanReview"] === "number" ? mapping["needsHumanReview"] : 0;
    out.push(
      `Coverage: ${status} (covered ${covered} | candidate ${candidate} | missing ${missing} | needs-human ${human})`,
    );

    const items = Array.isArray(mapping["items"]) ? mapping["items"] : [];
    const previewLimit = 5;
    const preview = items.slice(0, previewLimit);
    for (const raw of preview) {
      if (!isRecord(raw)) continue;
      const status = typeof raw["status"] === "string" ? raw["status"] : "?";
      const id = typeof raw["criterionId"] === "string" ? raw["criterionId"] : "?";
      const text = typeof raw["criterionText"] === "string" ? raw["criterionText"] : "";
      const truncated = text.length > 60 ? `${text.slice(0, 60)}…` : text;
      out.push(`  [${status}] ${id} — ${truncated}`);
    }
    if (items.length > preview.length) {
      out.push(`  … and ${items.length - preview.length} more`);
    }
  }

  if (analysis !== null && isStringArray(analysis["riskFlags"])) {
    const flags = analysis["riskFlags"];
    if (flags.length > 0) {
      const top = flags.slice(0, 3).join(", ");
      out.push(`Risk flags: ${top}${flags.length > 3 ? ` (+${flags.length - 3} more)` : ""}`);
    }
  }

  if (analysis !== null && typeof analysis["nextSuggestedAction"] === "string") {
    out.push("");
    out.push(`Next: ${analysis["nextSuggestedAction"]}`);
  }
}

function appendVerifyStatusBlock(out: string[], data: Record<string, unknown>): void {
  const verification = isRecord(data["verification"]) ? data["verification"] : null;
  const local = isRecord(data["local"]) ? data["local"] : null;
  const acceptance = isRecord(data["acceptance"]) ? data["acceptance"] : null;
  const pr = isRecord(data["pr"]) ? data["pr"] : null;
  const mode = typeof data["mode"] === "string" ? data["mode"] : "?";

  const status =
    verification !== null && typeof verification["status"] === "string"
      ? verification["status"]
      : "?";
  const ready = verification !== null && verification["readyForReview"] === true ? "yes" : "no";
  out.push(`Verification status: ${status}`);
  out.push(`Ready for review: ${ready}`);
  out.push(`Mode: ${mode}`);

  const requiredCommands =
    verification !== null && isStringArray(verification["requiredCommands"])
      ? verification["requiredCommands"]
      : [];
  if (requiredCommands.length === 0) {
    out.push("Local commands available: (none detected)");
  } else {
    out.push("Local commands available:");
    for (const cmd of requiredCommands) out.push(`- ${cmd}`);
  }

  if (acceptance !== null) {
    const cs =
      typeof acceptance["coverageStatus"] === "string" ? acceptance["coverageStatus"] : "?";
    const covered = typeof acceptance["covered"] === "number" ? acceptance["covered"] : 0;
    const candidate = typeof acceptance["candidate"] === "number" ? acceptance["candidate"] : 0;
    const missing = typeof acceptance["missing"] === "number" ? acceptance["missing"] : 0;
    const human =
      typeof acceptance["needsHumanReview"] === "number" ? acceptance["needsHumanReview"] : 0;
    out.push(
      `Acceptance coverage: ${cs} (covered ${covered} | candidate ${candidate} | missing ${missing} | human-review ${human})`,
    );
  }

  if (pr !== null) {
    const summary = typeof pr["checksSummary"] === "string" ? pr["checksSummary"] : "?";
    const passed = typeof pr["passed"] === "number" ? pr["passed"] : 0;
    const failed = typeof pr["failed"] === "number" ? pr["failed"] : 0;
    const pending = typeof pr["pending"] === "number" ? pr["pending"] : 0;
    out.push(`PR checks: ${summary} (passed ${passed} | failed ${failed} | pending ${pending})`);
  }

  if (local !== null && isRecord(local["git"])) {
    const git = local["git"];
    const branch =
      typeof git["branch"] === "string"
        ? git["branch"]
        : git["branch"] === null
          ? "(detached)"
          : "?";
    const dirty = git["isDirty"] === true ? "dirty" : "clean";
    out.push(`Local git: ${branch} (${dirty})`);
  }

  const riskFlags =
    verification !== null && isStringArray(verification["riskFlags"])
      ? verification["riskFlags"]
      : [];
  if (riskFlags.length > 0) {
    out.push("Risk flags:");
    for (const f of riskFlags.slice(0, 5)) out.push(`- ${f}`);
  }

  const missingSignals =
    verification !== null && isStringArray(verification["missingSignals"])
      ? verification["missingSignals"]
      : [];
  if (missingSignals.length > 0) {
    out.push("Missing signals:");
    for (const s of missingSignals.slice(0, 5)) out.push(`- ${s}`);
  }

  if (verification !== null && typeof verification["nextSuggestedAction"] === "string") {
    out.push(`Next: ${verification["nextSuggestedAction"]}`);
  }
}

function appendVerdictDraftBlock(out: string[], data: Record<string, unknown>): void {
  const verdict = isRecord(data["verdict"]) ? data["verdict"] : null;
  const mode = typeof data["mode"] === "string" ? data["mode"] : "?";
  const warnings = isStringArray(data["warnings"]) ? data["warnings"] : [];

  if (verdict === null) return;

  const category = typeof verdict["category"] === "string" ? verdict["category"] : "?";
  const confidence = typeof verdict["confidence"] === "string" ? verdict["confidence"] : "?";
  out.push(`Verdict: ${category}`);
  out.push(`Confidence: ${confidence}`);
  out.push(`Mode: ${mode}`);

  const supports = isStringArray(verdict["supports"]) ? verdict["supports"] : [];
  out.push("Why:");
  if (supports.length === 0) {
    out.push("- (no supporting evidence collected)");
  } else {
    for (const s of supports.slice(0, 5)) out.push(`- ${s}`);
  }

  const blocks = isStringArray(verdict["blocks"]) ? verdict["blocks"] : [];
  out.push("Blocks:");
  if (blocks.length === 0) {
    out.push("- (no blocking evidence detected)");
  } else {
    for (const b of blocks.slice(0, 5)) out.push(`- ${b}`);
  }

  const human = verdict["humanReviewRequired"] === true ? "yes" : "no";
  out.push(`Human review required: ${human}`);

  const next =
    typeof verdict["nextSuggestedAction"] === "string" ? verdict["nextSuggestedAction"] : "?";
  out.push(`Next: ${next}`);

  if (warnings.length > 0) {
    out.push("Warnings:");
    for (const w of warnings) out.push(`- ${w}`);
  }
}

function appendNextPromptBlock(out: string[], data: Record<string, unknown>): void {
  const summary = isRecord(data["summary"]) ? data["summary"] : null;
  const agent = typeof data["agent"] === "string" ? data["agent"] : "?";
  const mode = typeof data["mode"] === "string" ? data["mode"] : "?";
  const coverage =
    summary !== null && typeof summary["acceptanceCoverageStatus"] === "string"
      ? summary["acceptanceCoverageStatus"]
      : "?";
  const gitStatus =
    summary !== null && typeof summary["gitStatus"] === "string" ? summary["gitStatus"] : "?";
  out.push(`Agent: ${agent} | Mode: ${mode} | Coverage: ${coverage} | Git: ${gitStatus}`);
  out.push("");
  if (typeof data["prompt"] === "string") {
    out.push(data["prompt"]);
  }
}

function appendExecStatusBlock(out: string[], data: Record<string, unknown>): void {
  const git = isRecord(data["git"]) ? data["git"] : undefined;
  const ocn = isRecord(data["ocn"]) ? data["ocn"] : undefined;
  const analysis = isRecord(data["analysis"]) ? data["analysis"] : undefined;

  if (git === undefined) return;

  if (git["isGitRepo"] === false) {
    const reason = typeof git["reason"] === "string" ? git["reason"] : "unknown";
    out.push(`Git: not a repository (${reason})`);
  } else {
    const branch = git["branch"];
    const branchLabel =
      typeof branch === "string" ? branch : branch === null ? "(detached HEAD)" : "?";
    const head = typeof git["head"] === "string" ? git["head"] : "(no commits)";
    const dirty = git["isDirty"] === true ? "dirty" : "clean";
    out.push(`Branch: ${branchLabel}`);
    out.push(`HEAD:   ${head}`);
    out.push(`Working tree: ${dirty}`);

    const changedFiles = isStringArray(git["changedFiles"]) ? git["changedFiles"] : [];
    out.push(`Changed files: ${changedFiles.length}`);
    const preview = changedFiles.slice(0, 5);
    for (const f of preview) {
      out.push(`  - ${f}`);
    }
    if (changedFiles.length > preview.length) {
      out.push(`  … and ${changedFiles.length - preview.length} more`);
    }
  }

  if (ocn !== undefined && ocn["isOcnProject"] === true) {
    const stateId = typeof ocn["currentStateId"] === "string" ? ocn["currentStateId"] : "?";
    const stepId = typeof ocn["currentStepId"] === "string" ? ocn["currentStepId"] : "?";
    out.push(`OCN: ${stateId} / ${stepId}`);
  } else if (ocn !== undefined && ocn["isOcnProject"] === false) {
    out.push("OCN: not initialized");
  }

  if (analysis !== undefined && typeof analysis["nextSuggestedAction"] === "string") {
    out.push("");
    out.push(`Next: ${analysis["nextSuggestedAction"]}`);
  }
}

export function renderText<T>(result: CommandResult<T>, locale: "zh" | "en"): string {
  const lines: string[] = [];
  lines.push(formatBilingual(result.message.en, result.message.zh, locale));

  if (result.ok && isRecord(result.data)) {
    const data = result.data;
    lines.push("");
    if (data["command"] === "readiness.list") {
      appendReadinessListBlock(lines, data);
    } else if (data["command"] === "task.list") {
      appendTaskListBlock(lines, data);
    } else if (data["command"] === "exec.status" && data["implemented"] === true) {
      appendExecStatusBlock(lines, data);
    } else if (data["command"] === "github.analyze_pr" && data["implemented"] === true) {
      appendGithubAnalyzePrBlock(lines, data);
    } else if (data["command"] === "evidence.map" && data["implemented"] === true) {
      appendEvidenceMapBlock(lines, data);
    } else if (data["command"] === "next_prompt" && data["implemented"] === true) {
      appendNextPromptBlock(lines, data);
    } else if (data["command"] === "verify.status" && data["implemented"] === true) {
      appendVerifyStatusBlock(lines, data);
    } else if (data["command"] === "verdict.draft" && data["implemented"] === true) {
      appendVerdictDraftBlock(lines, data);
    } else if ("aiGovernanceReminder" in data || "currentBlockers" in data) {
      appendBriefBlock(lines, data);
    } else if ("currentStateId" in data || "currentStepId" in data) {
      appendStatusBlock(lines, data);
    } else if (typeof data["artifactPath"] === "string") {
      lines.push(`Artifact: ${data["artifactPath"]}`);
      if (typeof data["status"] === "string") lines.push(`Status: ${data["status"]}`);
    } else if (typeof data["stateFile"] === "string") {
      lines.push(`State file: ${data["stateFile"]}`);
      if (typeof data["currentStateId"] === "string") {
        lines.push(`Initialized at: ${data["currentStateId"]} / ${data["currentStepId"] ?? ""}`);
      }
    }
  }

  if (!result.ok && isRecord(result.data)) {
    const data = result.data;
    lines.push("");
    if (data["command"] === "github.analyze_pr") {
      appendGithubAnalyzePrBlock(lines, data);
    } else {
      if (typeof data["artifactPath"] === "string") {
        lines.push(`Artifact: ${data["artifactPath"]}`);
      }
      if (typeof data["status"] === "string") {
        lines.push(`Status: ${data["status"]}`);
      }
      if (isStringArray(data["missingRequiredSectionIds"])) {
        lines.push(`Missing required sections: ${data["missingRequiredSectionIds"].join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}
