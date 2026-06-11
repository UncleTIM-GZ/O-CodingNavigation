import { promises as fs } from "node:fs";
import type { CommandResult } from "../../types/result.js";
import { createAuditEvent, safeAudit } from "../audit/index.js";
import { writeArtifact } from "../artifact/template-writer.js";
import { msg } from "../i18n.js";
import { Paths } from "../paths.js";
import { blocked, ok } from "../result.js";
import { ensureClaudeMdImport } from "./claude-md.js";
import { mergeClaudeSettings, type SetupFileAction } from "./settings-merge.js";
import { OCN_MD_CONTENT } from "./templates/ocn-md.js";
import { OCN_NEXT_COMMAND_CONTENT } from "./templates/ocn-next-command.js";

// AM-006 / DEC-031 — `ocn agent setup`: one idempotent command that wires a
// project for Claude Code. Generates four surfaces:
//   .claude/settings.json        — Stop + PostToolUse hooks (merge-not-overwrite)
//   .claude/ocn.md               — governance contract (OCN-owned, regenerated)
//   CLAUDE.md                    — `@.claude/ocn.md` import (append-once)
//   .claude/commands/ocn-next.md — /ocn-next slash command (OCN-owned)
// Human-only (writes config — same class as init); never exposed over MCP.

export interface AgentSetupOptions {
  readonly cwd: string;
  readonly force: boolean;
}

export interface AgentSetupFile {
  readonly path: string;
  readonly action: SetupFileAction;
}

export interface AgentSetupData {
  readonly command: "agent.setup";
  readonly files: readonly AgentSetupFile[];
}

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Regenerate an OCN-owned file; skip the write when content is identical. */
async function writeOwnedFile(path: string, content: string): Promise<SetupFileAction> {
  const existing = await readFileOrNull(path);
  if (existing === content) return "skipped";
  await writeArtifact(path, content, true);
  return existing === null ? "created" : "updated";
}

async function applySettings(
  cwd: string,
  force: boolean,
): Promise<{ action: SetupFileAction } | { blockedResult: CommandResult<AgentSetupData> }> {
  const settingsPath = Paths.claudeSettings(cwd);
  const existing = await readFileOrNull(settingsPath);
  const merged = mergeClaudeSettings(existing);
  if (!merged.ok) {
    if (!force) {
      return {
        blockedResult: blocked(
          "ERR_IO_OR_CONFIG",
          msg(
            ".claude/settings.json is not valid JSON. Fix it manually, or rerun with --force to back it up and rewrite.",
            ".claude/settings.json 不是合法 JSON。请手工修复，或使用 --force 备份后重写。",
          ),
          { settingsPath },
        ),
      };
    }
    await fs.writeFile(`${settingsPath}.bak`, existing ?? "", "utf8");
    const fresh = mergeClaudeSettings(null);
    if (!fresh.ok) throw new Error("unreachable: fresh settings merge cannot be malformed");
    await writeArtifact(settingsPath, fresh.content, true);
    return { action: "updated" };
  }
  if (merged.action !== "skipped") {
    await writeArtifact(settingsPath, merged.content, true);
  }
  return { action: merged.action };
}

export async function setupAgentIntegration(
  opts: AgentSetupOptions,
): Promise<CommandResult<AgentSetupData>> {
  try {
    await fs.access(Paths.stateFile(opts.cwd));
  } catch {
    return blocked(
      "ERR_IO_OR_CONFIG",
      msg(
        "OCN is not initialized in this directory. Run `ocn init` first.",
        "当前目录未初始化 OCN，请先执行 `ocn init`。",
      ),
    );
  }

  // Settings first: a malformed settings file aborts before ANY write
  // (all-or-nothing keeps reruns clean).
  const settings = await applySettings(opts.cwd, opts.force);
  if ("blockedResult" in settings) return settings.blockedResult;

  const files: AgentSetupFile[] = [
    { path: Paths.claudeSettings(opts.cwd), action: settings.action },
    {
      path: Paths.claudeOcnMd(opts.cwd),
      action: await writeOwnedFile(Paths.claudeOcnMd(opts.cwd), OCN_MD_CONTENT),
    },
    {
      path: Paths.claudeOcnNextCommand(opts.cwd),
      action: await writeOwnedFile(Paths.claudeOcnNextCommand(opts.cwd), OCN_NEXT_COMMAND_CONTENT),
    },
    { path: Paths.projectClaudeMd(opts.cwd), action: await ensureClaudeMdImport(opts.cwd) },
  ];

  const counts = files.reduce<Record<SetupFileAction, number>>(
    (acc, f) => ({ ...acc, [f.action]: acc[f.action] + 1 }),
    { created: 0, updated: 0, skipped: 0 },
  );

  await safeAudit(
    opts.cwd,
    createAuditEvent({
      eventType: "agent_setup_completed",
      result: "success",
      actor: "user",
      source: "cli",
      projectRoot: opts.cwd,
      command: "agent.setup",
      message: msg("Claude Code integration configured.", "Claude Code 集成已配置。"),
      relatedPaths: files.filter((f) => f.action !== "skipped").map((f) => f.path),
      data: { files },
    }),
  );

  return ok(
    msg(
      `Claude Code integration configured (${counts.created} created, ${counts.updated} updated, ${counts.skipped} skipped). Commit .claude/ and CLAUDE.md to share with the team.`,
      `Claude Code 集成已配置（新建 ${counts.created}、更新 ${counts.updated}、跳过 ${counts.skipped}）。提交 .claude/ 与 CLAUDE.md 即可全队共享。`,
    ),
    { command: "agent.setup", files },
  );
}
