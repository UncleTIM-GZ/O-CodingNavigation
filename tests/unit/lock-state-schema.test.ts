import { describe, expect, it } from "vitest";
import { LockState } from "../../src/types/lock.js";

describe("LockState schema", () => {
  const valid = {
    pid: 12345,
    createdAt: "2026-04-28T12:00:00.000Z",
    command: "init",
    client: "cli" as const,
    projectRoot: "/tmp/ocn-test",
  };

  it("parses a fully populated valid lock state", () => {
    expect(LockState.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-Z timestamp", () => {
    const bad = { ...valid, createdAt: "2026-04-28T12:00:00+08:00" };
    expect(LockState.safeParse(bad).success).toBe(false);
  });

  it("rejects pid <= 0", () => {
    expect(LockState.safeParse({ ...valid, pid: 0 }).success).toBe(false);
    expect(LockState.safeParse({ ...valid, pid: -1 }).success).toBe(false);
  });

  it("rejects non-integer pid", () => {
    expect(LockState.safeParse({ ...valid, pid: 12.5 }).success).toBe(false);
  });

  it("rejects empty command", () => {
    expect(LockState.safeParse({ ...valid, command: "" }).success).toBe(false);
  });

  it("rejects client other than 'cli'", () => {
    expect(LockState.safeParse({ ...valid, client: "mcp" }).success).toBe(false);
  });

  it("rejects extra unknown keys (strict mode)", () => {
    expect(LockState.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });

  it("rejects missing projectRoot", () => {
    const { projectRoot: _omit, ...rest } = valid;
    expect(LockState.safeParse(rest).success).toBe(false);
  });
});
