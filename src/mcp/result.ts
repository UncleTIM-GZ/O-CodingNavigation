import type { BilingualMessage } from "../types/i18n.js";
import type { CommandResult, ErrorCode, FailureCode } from "../types/result.js";

// PR #5 — MCP tool result envelope. Identical shape to CommandResult so the
// adapter from core fns is structural. Plus `mcpFromCommandResult` to convert
// directly without re-engineering messages.

export interface MCPToolResultErrorEnvelope {
  code: FailureCode;
  message: BilingualMessage;
  details?: unknown;
}

export type MCPToolResult<T = unknown> =
  | {
      ok: true;
      code: "OK";
      message: BilingualMessage;
      data?: T;
    }
  | {
      ok: false;
      code: FailureCode;
      message: BilingualMessage;
      data?: unknown;
      error: MCPToolResultErrorEnvelope;
    };

export function mcpOk<T>(message: BilingualMessage, data?: T): MCPToolResult<T> {
  if (data !== undefined) {
    return { ok: true, code: "OK", message, data };
  }
  return { ok: true, code: "OK", message };
}

export function mcpBlocked<T = never>(
  code: FailureCode,
  message: BilingualMessage,
  data?: unknown,
  details?: unknown,
): MCPToolResult<T> {
  const envelope: MCPToolResult<T> & { ok: false } = {
    ok: false,
    code,
    message,
    error: details !== undefined ? { code, message, details } : { code, message },
  };
  if (data !== undefined) envelope.data = data;
  return envelope;
}

/** Convert a CommandResult from the core layer into an MCPToolResult.
 *  Structurally identical — this is a typed re-cast plus a defensive copy
 *  to keep the two surfaces decoupled. */
export function mcpFromCommandResult<T>(
  result: CommandResult<T>,
): MCPToolResult<T> {
  if (result.ok) {
    if (result.data !== undefined) {
      return { ok: true, code: "OK", message: result.message, data: result.data };
    }
    return { ok: true, code: "OK", message: result.message };
  }
  const envelope: MCPToolResult<T> & { ok: false } = {
    ok: false,
    code: result.code,
    message: result.message,
    error: result.error,
  };
  if (result.data !== undefined) envelope.data = result.data;
  return envelope;
}

/** Map an ErrorCode to an MCP CallToolResult `isError` flag. */
export const isErrorResult = (code: ErrorCode): boolean => code !== "OK";

/** Convert an MCPToolResult to the JSON-RPC content block payload that the
 *  MCP SDK expects from a tool callback. The SDK wraps these blocks with
 *  isError automatically when we return them; we set `isError` explicitly
 *  for failures so clients can branch without parsing the envelope. */
export function toCallToolResult<T>(result: MCPToolResult<T>): {
  isError: boolean;
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    isError: !result.ok,
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
