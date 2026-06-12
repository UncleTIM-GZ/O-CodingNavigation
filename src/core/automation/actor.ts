import type { AuditActor } from "../../types/audit.js";

// AM-009 / DEC-034 — who is invoking the CLI? Resolution order:
//   --actor flag  >  OCN_ACTOR env  >  "user".
// Only "user" and "ai_agent" are valid caller identities; "system" is
// engine-internal (circuit-breaker suspend events). The env channel exists so
// `ocn agent setup` can inject OCN_ACTOR=ai_agent once into the agent's
// settings instead of relying on the AI to remember a flag per command.
//
// This is a GOVERNANCE SIGNATURE, not a security boundary: an agent that
// unsets the env can impersonate a human. OCN's threat model is the honest
// agent (see AM-009) — the value is audit distinguishability, and the switch
// events themselves (`ocn auto on/off/resume`) remain human-only.

const CALLER_ACTORS = ["user", "ai_agent"] as const;
type CallerActor = (typeof CALLER_ACTORS)[number];

export const OCN_ACTOR_ENV = "OCN_ACTOR";

export class InvalidActorError extends Error {
  /** Stable machine reason — rendered as exit 4 / ERR_IO_OR_CONFIG at the CLI. */
  public readonly reason = "invalid_actor";

  constructor(
    public readonly channel: "flag" | "env",
    public readonly value: string,
  ) {
    super(
      `Invalid actor "${value}" from ${channel}; expected one of: ${CALLER_ACTORS.join(", ")}`,
    );
    this.name = "InvalidActorError";
  }
}

function parseCaller(value: string, channel: "flag" | "env"): CallerActor {
  if ((CALLER_ACTORS as readonly string[]).includes(value)) return value as CallerActor;
  throw new InvalidActorError(channel, value);
}

export function resolveActor(
  explicitFlag?: string,
  env: Record<string, string | undefined> = process.env,
): AuditActor {
  if (explicitFlag !== undefined) return parseCaller(explicitFlag, "flag");
  const fromEnv = env[OCN_ACTOR_ENV]?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) return parseCaller(fromEnv, "env");
  return "user";
}
