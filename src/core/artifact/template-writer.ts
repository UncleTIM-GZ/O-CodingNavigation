import { promises as fs } from "node:fs";
import { dirname } from "node:path";

export class FileExistsError extends Error {
  constructor(public readonly filePath: string) {
    super(`File already exists: ${filePath}`);
    this.name = "FileExistsError";
  }
}

/**
 * Write a template to disk with race-safe overwrite semantics.
 *
 * Post-Codex P2 fix: the previous implementation did `fs.stat` then
 * `fs.writeFile` when `overwrite=false`. Two concurrent calls could both
 * pass the existence check and one would silently overwrite the other.
 *
 * Now:
 *   - `overwrite=false` → `fs.open(path, "wx")` performs an atomic exclusive
 *     create. EEXIST surfaces as `FileExistsError` deterministically; no
 *     concurrent call can both pass and silently overwrite.
 *   - `overwrite=true`  → write to a unique tmp file then `fs.rename` it
 *     into place. `rename(2)` is atomic on the same filesystem, so readers
 *     never see a partially-written file even if two calls race; the last
 *     rename wins and the file always contains the full content of the
 *     winning call.
 */
export async function writeArtifact(
  filePath: string,
  content: string,
  overwrite = false,
): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  if (!overwrite) {
    try {
      const handle = await fs.open(filePath, "wx");
      try {
        await handle.writeFile(content, "utf8");
      } finally {
        await handle.close();
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        throw new FileExistsError(filePath);
      }
      throw err;
    }
    return;
  }
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    await fs.writeFile(tmp, content, "utf8");
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}
