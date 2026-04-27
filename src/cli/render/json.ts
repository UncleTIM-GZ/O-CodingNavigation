import type { CommandResult } from "../../types/result.js";

export function renderJson<T>(result: CommandResult<T>): string {
  return JSON.stringify(result, null, 2);
}
