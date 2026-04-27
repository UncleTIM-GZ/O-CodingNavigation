#!/usr/bin/env node
import { Command } from "commander";
import { registerBriefCommand } from "./commands/brief.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerDocCommand } from "./commands/doc.js";
import { registerInitCommand } from "./commands/init.js";
import { registerStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("ocn")
  .description(
    "O'CodingNavigator — local-first AI Coding workflow operating system (Skeleton Spike).",
  )
  .version("0.0.1-alpha.0");

registerInitCommand(program);
registerStatusCommand(program);
registerBriefCommand(program);
registerDocCommand(program);
registerCheckCommand(program);

await program.parseAsync(process.argv);
