import { describe, expect, it } from "vitest";
import {
  isErrorResult,
  mcpBlocked,
  mcpFromCommandResult,
  mcpOk,
  toCallToolResult,
} from "../../src/mcp/result.js";
import { msg } from "../../src/core/i18n.js";
import { ok, blocked } from "../../src/core/result.js";

describe("MCPToolResult builders + adapters", () => {
  it("mcpOk produces ok=true / code=OK and preserves data", () => {
    const r = mcpOk(msg("done", "完成"), { x: 1 });
    expect(r.ok).toBe(true);
    expect(r.code).toBe("OK");
    if (r.ok) expect(r.data).toEqual({ x: 1 });
  });

  it("mcpOk omits data when not provided", () => {
    const r = mcpOk(msg("done", "完成"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeUndefined();
  });

  it("mcpBlocked produces ok=false with error envelope and matching code", () => {
    const r = mcpBlocked(
      "ERR_GATE_FAILED",
      msg("denied", "拒绝"),
      { reason: "x" },
      { trace: "y" },
    );
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_GATE_FAILED");
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_GATE_FAILED");
      expect(r.error.details).toEqual({ trace: "y" });
      expect(r.data).toEqual({ reason: "x" });
    }
  });

  it("mcpFromCommandResult passes ok success through unchanged", () => {
    const cr = ok(msg("ok", "ok"), { y: 2 });
    const mcp = mcpFromCommandResult(cr);
    expect(mcp.ok).toBe(true);
    if (mcp.ok) expect(mcp.data).toEqual({ y: 2 });
  });

  it("mcpFromCommandResult passes blocked through with error envelope", () => {
    const cr = blocked(
      "ERR_ARTIFACT_INVALID",
      msg("bad", "差"),
      { artifact: "p" },
      { reason: "z" },
    );
    const mcp = mcpFromCommandResult(cr);
    expect(mcp.ok).toBe(false);
    if (!mcp.ok) {
      expect(mcp.code).toBe("ERR_ARTIFACT_INVALID");
      expect(mcp.error.details).toEqual({ reason: "z" });
    }
  });

  it("isErrorResult flips on non-OK codes", () => {
    expect(isErrorResult("OK")).toBe(false);
    expect(isErrorResult("ERR_GATE_FAILED")).toBe(true);
    expect(isErrorResult("ERR_IO_OR_CONFIG")).toBe(true);
  });

  it("toCallToolResult emits a single text content block with the JSON envelope", () => {
    const r = mcpOk(msg("done", "完成"), { z: 3 });
    const wrapped = toCallToolResult(r);
    expect(wrapped.isError).toBe(false);
    expect(wrapped.content).toHaveLength(1);
    expect(wrapped.content[0]?.type).toBe("text");
    const parsed = JSON.parse(wrapped.content[0]!.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toEqual({ z: 3 });
  });

  it("toCallToolResult marks isError=true on failures", () => {
    const r = mcpBlocked("ERR_GATE_FAILED", msg("nope", "不行"));
    const wrapped = toCallToolResult(r);
    expect(wrapped.isError).toBe(true);
  });
});
