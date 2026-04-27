import { z } from "zod";

// LockState is the JSON content of `.ocoding/.lock`. Plan §2.1 + test-strategy §1657.
// The owner of the lock writes its own pid + timestamp + intent so future acquirers
// can decide whether to wait or to reclaim a stale lock.
export const LockState = z
  .object({
    pid: z.number().int().positive(),
    createdAt: z.string().regex(/Z$/, "createdAt must be ISO 8601 UTC ending Z"),
    command: z.string().min(1),
    client: z.literal("cli"), // "mcp" reserved for Phase 2 PR #5
    projectRoot: z.string().min(1),
  })
  .strict();

export type LockState = z.infer<typeof LockState>;
