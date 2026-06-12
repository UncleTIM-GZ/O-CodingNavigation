import { describe, expect, it } from "vitest";
import { InvalidActorError, resolveActor } from "../../src/core/automation/actor.js";

// AM-009 / DEC-034 — actor resolution: --actor flag > OCN_ACTOR env > "user".
// Only "user" and "ai_agent" are valid CLI callers ("system" is engine-internal,
// reserved for circuit-breaker suspend events). Invalid values fail fast
// (exit 4 at the CLI layer) — a governance signature, not a security boundary.

describe("resolveActor", () => {
  it("defaults to user with no flag and no env", () => {
    expect(resolveActor(undefined, {})).toBe("user");
  });

  it("reads ai_agent from OCN_ACTOR env", () => {
    expect(resolveActor(undefined, { OCN_ACTOR: "ai_agent" })).toBe("ai_agent");
  });

  it("reads user from OCN_ACTOR env", () => {
    expect(resolveActor(undefined, { OCN_ACTOR: "user" })).toBe("user");
  });

  it("explicit flag overrides env", () => {
    expect(resolveActor("user", { OCN_ACTOR: "ai_agent" })).toBe("user");
    expect(resolveActor("ai_agent", { OCN_ACTOR: "user" })).toBe("ai_agent");
  });

  it("treats an empty/whitespace env value as unset", () => {
    expect(resolveActor(undefined, { OCN_ACTOR: "  " })).toBe("user");
  });

  it("rejects invalid flag values fast", () => {
    expect(() => resolveActor("robot", {})).toThrow(InvalidActorError);
  });

  it("rejects invalid env values fast", () => {
    expect(() => resolveActor(undefined, { OCN_ACTOR: "robot" })).toThrow(InvalidActorError);
  });

  it("rejects 'system' from both channels (engine-internal only)", () => {
    expect(() => resolveActor("system", {})).toThrow(InvalidActorError);
    expect(() => resolveActor(undefined, { OCN_ACTOR: "system" })).toThrow(InvalidActorError);
  });
});
