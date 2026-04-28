import { brief } from "./brief.js";
import { captureLogTool } from "./capture-log.js";
import { createArtifactTool } from "./create-artifact.js";
import { detectSopVersionTool } from "./detect-sop-version.js";
import { generateNextPromptTool } from "./generate-next-prompt.js";
import { runGateTool } from "./run-gate.js";
import { whereAmI } from "./where-am-i.js";
import type { MCPToolResult } from "../result.js";

// PR #5 — exactly 7 allowed tools. Tests verify this list does NOT include
// any of: navigator.advance_phase, navigator.capture_decision,
// navigator.reset_project, navigator.force_release_lock.

export type AnyTool = {
  readonly name: string;
  readonly description: string;
  readonly inputShape: Record<string, unknown>;
  readonly handler: (args: unknown) => Promise<MCPToolResult<unknown>>;
};

export const ALLOWED_TOOLS: readonly AnyTool[] = [
  whereAmI,
  brief,
  runGateTool,
  createArtifactTool,
  captureLogTool,
  detectSopVersionTool,
  generateNextPromptTool,
];

export const FORBIDDEN_TOOL_NAMES: readonly string[] = [
  "navigator.advance_phase",
  "navigator.capture_decision",
  "navigator.reset_project",
  "navigator.force_release_lock",
];

export const ALLOWED_TOOL_NAMES: readonly string[] = ALLOWED_TOOLS.map((t) => t.name);

export {
  brief,
  captureLogTool,
  createArtifactTool,
  detectSopVersionTool,
  generateNextPromptTool,
  runGateTool,
  whereAmI,
};
