import { promises as fs } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TempProject {
  readonly cwd: string;
  cleanup(): Promise<void>;
}

export async function createTempProject(prefix = "ocn-test-"): Promise<TempProject> {
  const cwd = await mkdtemp(join(tmpdir(), prefix));
  return {
    cwd,
    async cleanup() {
      await rm(cwd, { recursive: true, force: true });
    },
  };
}

export async function cleanupTempProject(cwd: string): Promise<void> {
  await rm(cwd, { recursive: true, force: true });
}

export async function copyFileToProject(
  project: TempProject,
  src: string,
  destRelative: string,
): Promise<string> {
  const dest = join(project.cwd, destRelative);
  await fs.mkdir(join(dest, ".."), { recursive: true });
  await fs.copyFile(src, dest);
  return dest;
}
