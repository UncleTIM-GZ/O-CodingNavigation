import { promises as fs } from "node:fs";
import { dirname } from "node:path";

export class FileExistsError extends Error {
  constructor(public readonly filePath: string) {
    super(`File already exists: ${filePath}`);
    this.name = "FileExistsError";
  }
}

export async function writeArtifact(
  filePath: string,
  content: string,
  overwrite = false,
): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  if (!overwrite) {
    let exists = false;
    try {
      await fs.stat(filePath);
      exists = true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
    }
    if (exists) throw new FileExistsError(filePath);
  }
  await fs.writeFile(filePath, content, "utf8");
}
