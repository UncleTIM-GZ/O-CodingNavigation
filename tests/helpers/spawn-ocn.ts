import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CLI_ENTRY = resolve(here, "..", "..", "src", "cli", "index.ts");

export interface SpawnOcnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SpawnOcnOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

// Launches the OCN CLI in a child Node.js process via tsx.
// Arguments are passed as an array — no shell, no shell-string interpolation.
// `shell: false` is the default and is intentionally NOT overridden.
export async function spawnOcn(
  args: readonly string[],
  opts: SpawnOcnOptions,
): Promise<SpawnOcnResult> {
  return new Promise<SpawnOcnResult>((resolvePromise, rejectPromise) => {
    const child = spawn(
      "npx",
      ["--no-install", "tsx", CLI_ENTRY, ...args],
      {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env, NODE_NO_WARNINGS: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    let timer: NodeJS.Timeout | undefined;

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolvePromise({ stdout, stderr, exitCode: code ?? 1 });
    });

    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill("SIGKILL");
      }, opts.timeoutMs);
    }
  });
}
