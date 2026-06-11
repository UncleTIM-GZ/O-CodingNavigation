import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { Paths } from "../paths.js";
import type { ProjectCommands } from "./project-config.js";

// P5 (R4) — frozen snapshot of the readiness probe commands + tier.
// `.ocoding/readiness-frozen.json`. The referee's inputs (what the engine
// executes, which tier filters the rulebook) must not drift silently: the
// snapshot is the baseline; every gate run compares against it and any
// change becomes an audited push event. Detection + trail, not prevention —
// local-first cannot stop a write, but it can make every write visible.

export const ReadinessFrozenConfig = z
  .object({
    capturedAt: z.string(),
    tier: z.string(),
    commands: z
      .object({
        build: z.string().optional(),
        test: z.string().optional(),
        test_list: z.string().optional(),
      })
      .strict(),
    hash: z.string(),
  })
  .strict();
export type ReadinessFrozenConfig = z.infer<typeof ReadinessFrozenConfig>;

export function hashFrozen(tier: string, commands: ProjectCommands): string {
  const canonical = JSON.stringify({
    tier,
    build: commands.build ?? "",
    test: commands.test ?? "",
    test_list: commands.test_list ?? "",
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export async function readFrozenConfig(root: string): Promise<ReadinessFrozenConfig | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.readinessFrozenFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = ReadinessFrozenConfig.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeFrozenConfig(
  root: string,
  snapshot: ReadinessFrozenConfig,
): Promise<void> {
  const file = Paths.readinessFrozenFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
