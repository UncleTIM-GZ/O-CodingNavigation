import { describe, expect, it } from "vitest";
import { mergeClaudeSettings } from "../../src/core/agent-setup/settings-merge.js";

// AM-006 — pure merge rules for .claude/settings.json (no IO).

type Hooks = {
  Stop?: Array<{ hooks: Array<{ command: string }> }>;
  PostToolUse?: Array<{ matcher?: string; hooks: Array<{ command: string }> }>;
};

function parseContent(result: ReturnType<typeof mergeClaudeSettings>): Record<string, unknown> {
  if (!result.ok) throw new Error("expected ok merge");
  return JSON.parse(result.content) as Record<string, unknown>;
}

describe("mergeClaudeSettings (AM-006)", () => {
  it("creates a fresh settings object when the file is absent", () => {
    const result = mergeClaudeSettings(null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("created");
    const root = parseContent(result);
    const hooks = root["hooks"] as Hooks;
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.Stop?.[0]?.hooks[0]?.command).toContain("ocn hook stop");
    expect(hooks.Stop?.[0]?.hooks[0]?.command).toContain("command -v ocn");
    expect(hooks.PostToolUse?.[0]?.matcher).toBe("Edit|Write");
    expect(hooks.PostToolUse?.[0]?.hooks[0]?.command).toContain("ocn hook post-edit");
  });

  it("appends to existing settings and preserves unrelated keys verbatim", () => {
    const existing = JSON.stringify({
      permissions: { allow: ["Bash(npm test:*)"] },
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "echo pre" }] }],
      },
    });
    const result = mergeClaudeSettings(existing);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("updated");
    const root = parseContent(result);
    expect(root["permissions"]).toEqual({ allow: ["Bash(npm test:*)"] });
    const hooks = root["hooks"] as Hooks & { PreToolUse: unknown[] };
    expect(hooks.PreToolUse).toHaveLength(1);
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
  });

  it("skips (and returns the original text) when OCN entries already exist — even customized", () => {
    const existing = JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "ocn hook stop --custom-flag", timeout: 60 }] }],
        PostToolUse: [
          { matcher: "Edit", hooks: [{ type: "command", command: "nice -n 10 ocn hook post-edit" }] },
        ],
      },
    });
    const result = mergeClaudeSettings(existing);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("skipped");
    expect(result.content).toBe(existing);
  });

  it("appends only the missing event when the other already has an OCN entry", () => {
    const existing = JSON.stringify({
      hooks: { Stop: [{ hooks: [{ type: "command", command: "ocn hook stop" }] }] },
    });
    const result = mergeClaudeSettings(existing);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe("updated");
    const hooks = parseContent(result)["hooks"] as Hooks;
    expect(hooks.Stop).toHaveLength(1);
    expect(hooks.PostToolUse).toHaveLength(1);
  });

  it("flags malformed when an event slot is not an array", () => {
    const result = mergeClaudeSettings(JSON.stringify({ hooks: { Stop: "not-an-array" } }));
    expect(result.ok).toBe(false);
  });

  it("flags malformed on parse errors and non-object roots", () => {
    expect(mergeClaudeSettings("{ not json").ok).toBe(false);
    expect(mergeClaudeSettings("[1,2,3]").ok).toBe(false);
    expect(mergeClaudeSettings('"string"').ok).toBe(false);
  });
});
