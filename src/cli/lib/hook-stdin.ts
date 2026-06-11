// AM-006 — stdin reader for machine-facing `ocn hook *` subcommands.
// Claude Code pipes a JSON payload to hook commands; interactive invocation
// (a human typing `ocn hook stop` in a terminal) must never hang, so a TTY
// stdin short-circuits to null and a timeout caps non-TTY reads.

export async function readHookStdin(timeoutMs = 2000): Promise<string | null> {
  if (process.stdin.isTTY === true) return null;
  return new Promise((resolve) => {
    let buffer = "";
    let done = false;
    const finish = (value: string | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      finish(buffer.length > 0 ? buffer : null);
    }, timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => {
      finish(buffer.length > 0 ? buffer : null);
    });
    process.stdin.on("error", () => {
      finish(null);
    });
  });
}

export function parseHookPayload(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
