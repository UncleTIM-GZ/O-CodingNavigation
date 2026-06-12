import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import yaml from "js-yaml";
import { AutomationConfig } from "../../types/automation.js";
import { Paths } from "../paths.js";

// AM-009 / DEC-034 — the `automation:` block in the user-owned config.yaml.
//
// Reads are defensive in the FAIL-SAFE direction: absent file, broken YAML,
// or an invalid block (unknown key, wrong type) all resolve to fully manual —
// a misconfiguration can never silently grant the AI agent automation.
//
// Writes are block-surgical: config.yaml is the user's file (preserved across
// `ocn sop upgrade`), so we never re-serialize the whole document (js-yaml
// would drop comments). Only the top-level `automation:` block is replaced;
// every other byte survives.

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  phase1: false,
  phase2: false,
  circuitBreaker: { maxConsecutiveGateFailures: 5 },
};

export async function readAutomationConfig(root: string): Promise<AutomationConfig> {
  let text: string;
  try {
    text = await fs.readFile(Paths.configFile(root), "utf8");
  } catch {
    return DEFAULT_AUTOMATION_CONFIG;
  }
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch {
    return DEFAULT_AUTOMATION_CONFIG;
  }
  if (raw === null || typeof raw !== "object") return DEFAULT_AUTOMATION_CONFIG;
  const block = (raw as Record<string, unknown>)["automation"];
  if (block === undefined || block === null) return DEFAULT_AUTOMATION_CONFIG;
  const parsed = AutomationConfig.safeParse(block);
  return parsed.success ? parsed.data : DEFAULT_AUTOMATION_CONFIG;
}

function renderBlock(config: AutomationConfig): string {
  return [
    "automation:",
    `  phase1: ${config.phase1}`,
    `  phase2: ${config.phase2}`,
    "  circuitBreaker:",
    `    maxConsecutiveGateFailures: ${config.circuitBreaker.maxConsecutiveGateFailures}`,
    "",
  ].join("\n");
}

/**
 * Replace (or append) the top-level `automation:` block. The block spans from
 * its key line to the next line starting at column 0 — column-0 comments
 * after the block therefore survive; we always write the block fully indented
 * so this boundary is unambiguous for content we own.
 */
function spliceBlock(text: string, block: string): string {
  const lines = text.length > 0 ? text.split("\n") : [];
  const start = lines.findIndex((line) => /^automation:\s*(#.*)?$/.test(line));
  if (start === -1) {
    const body = lines.join("\n");
    const separator = body.length === 0 || body.endsWith("\n") ? "" : "\n";
    return body + separator + block;
  }
  let end = start + 1;
  while (end < lines.length && !/^\S/.test(lines[end] ?? "")) {
    end += 1;
  }
  // Drop trailing blank lines captured inside the old block region.
  let lastKept = end;
  while (lastKept > start + 1 && (lines[lastKept - 1] ?? "").trim() === "") {
    lastKept -= 1;
  }
  const before = lines.slice(0, start).join("\n");
  const after = lines.slice(end).join("\n");
  const head = before.length > 0 ? before + "\n" : "";
  const tail = after.length > 0 ? after : "";
  return head + block + tail;
}

export async function writeAutomationConfig(root: string, config: AutomationConfig): Promise<void> {
  const validated = AutomationConfig.parse(config);
  const file = Paths.configFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  let existing = "";
  try {
    existing = await fs.readFile(file, "utf8");
  } catch {
    // Absent file — write a fresh one containing only the block.
  }
  const next = spliceBlock(existing, renderBlock(validated));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, next, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
