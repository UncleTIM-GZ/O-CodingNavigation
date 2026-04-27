import type { CommandResult } from "../types/result.js";
import { exitCodeFor } from "../core/result.js";
import { renderJson } from "./render/json.js";
import { renderText } from "./render/text.js";

export interface OutputOptions {
  readonly json: boolean;
  readonly locale?: "zh" | "en";
}

export function outputResult<T>(result: CommandResult<T>, opts: OutputOptions): never {
  if (opts.json) {
    process.stdout.write(renderJson(result) + "\n");
  } else {
    const text = renderText(result, opts.locale ?? "zh");
    if (result.ok) {
      process.stdout.write(text + "\n");
    } else {
      process.stderr.write(text + "\n");
    }
  }
  process.exit(exitCodeFor(result.code));
}
