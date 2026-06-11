#!/usr/bin/env node
import { Command } from "commander";
import { registerAdvanceCommand } from "./commands/advance.js";
import { registerAgentCommand } from "./commands/agent.js";
import { registerBriefCommand } from "./commands/brief.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerDocCommand } from "./commands/doc.js";
import { registerEvidenceCommand } from "./commands/evidence.js";
import { registerExecCommand } from "./commands/exec.js";
import { registerGateCommand } from "./commands/gate.js";
import { registerGithubCommand } from "./commands/github.js";
import { registerHookCommand } from "./commands/hook.js";
import { registerInitCommand } from "./commands/init.js";
import { registerNextPromptCommand } from "./commands/next-prompt.js";
import { registerReadinessCommand } from "./commands/readiness.js";
import { registerSopCommand } from "./commands/sop.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerVerdictCommand } from "./commands/verdict.js";
import { registerVerifyCommand } from "./commands/verify.js";
import { PACKAGE_VERSION } from "../version.js";

const program = new Command();

program
  .name("ocn")
  .description("O'CodingNavigator — local-first AI Coding workflow operating system.")
  .version(PACKAGE_VERSION);

registerInitCommand(program);
registerStatusCommand(program);
registerBriefCommand(program);
registerDocCommand(program);
registerCheckCommand(program);
registerGateCommand(program);
registerAdvanceCommand(program);
// SOP 0.4.0 (AM-004) — role-based readiness checks.
registerReadinessCommand(program);
// DEC-029 / AM-005 — SOP profile upgrade (forward-only, human-only).
registerSopCommand(program);
// AM-006 / DEC-031 — Claude Code agent integration (setup + hook handlers).
registerAgentCommand(program);
registerHookCommand(program);
// Execution Navigator skeleton (DEC-024 PR 1) — read-only, no evidence ingestion yet.
registerExecCommand(program);
registerGithubCommand(program);
registerEvidenceCommand(program);
registerNextPromptCommand(program);
registerVerifyCommand(program);
registerVerdictCommand(program);

await program.parseAsync(process.argv);
