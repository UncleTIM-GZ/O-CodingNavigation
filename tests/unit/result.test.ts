import { describe, expect, it } from "vitest";
import { blocked, exitCodeFor, ok } from "../../src/core/result.js";
import { msg } from "../../src/core/i18n.js";

describe("CommandResult builders", () => {
  it("ok() returns a successful CommandResult with code OK", () => {
    const r = ok(msg("done", "完成"), { foo: 1 });
    expect(r.ok).toBe(true);
    expect(r.code).toBe("OK");
    expect(r.message).toEqual({ en: "done", zh: "完成" });
    if (r.ok) expect(r.data).toEqual({ foo: 1 });
  });

  it("ok() omits data when not provided", () => {
    const r = ok(msg("done", "完成"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeUndefined();
  });

  it("blocked() returns ok=false with error envelope", () => {
    const r = blocked("ERR_ARTIFACT_INVALID", msg("missing", "缺失"), { x: 1 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ERR_ARTIFACT_INVALID");
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_ARTIFACT_INVALID");
      expect(r.data).toEqual({ x: 1 });
    }
  });

  it("blocked() includes details when provided", () => {
    const r = blocked(
      "ERR_STATE_MACHINE",
      msg("invalid", "不合法"),
      undefined,
      { issues: ["a", "b"] },
    );
    if (!r.ok) {
      expect(r.error.details).toEqual({ issues: ["a", "b"] });
    }
  });
});

describe("exitCodeFor mapping", () => {
  it("maps every ErrorCode to the correct exit code", () => {
    expect(exitCodeFor("OK")).toBe(0);
    expect(exitCodeFor("ERR_GATE_FAILED")).toBe(1);
    expect(exitCodeFor("ERR_ARTIFACT_INVALID")).toBe(2);
    expect(exitCodeFor("ERR_STATE_MACHINE")).toBe(3);
    expect(exitCodeFor("ERR_IO_OR_CONFIG")).toBe(4);
    expect(exitCodeFor("ERR_SOP_VERSION")).toBe(5);
  });
});
