#!/usr/bin/env node
import { Command } from "commander";
import { registerAdvanceCommand } from "./commands/advance.js";
import { registerBriefCommand } from "./commands/brief.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerDocCommand } from "./commands/doc.js";
import { registerGateCommand } from "./commands/gate.js";
import { registerInitCommand } from "./commands/init.js";
import { registerStatusCommand } from "./commands/status.js";
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

await program.parseAsync(process.argv);
