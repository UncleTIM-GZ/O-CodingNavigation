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
    if (data["command"] === "exec.status" && data["implemented"] === true) {
      appendExecStatusBlock(lines, data);
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

  return lines.join("\n");
}
