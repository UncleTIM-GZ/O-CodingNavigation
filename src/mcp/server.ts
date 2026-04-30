import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setAuditFallbackLogger, silentAuditFallbackLogger } from "../core/audit/index.js";
import { PACKAGE_VERSION } from "../version.js";
import { ALLOWED_TOOLS } from "./tools/index.js";
import { toCallToolResult } from "./result.js";

// PR #5 — MCP stdio server entry. Stdio transport only; HTTP/SSE deferred.
//
// CRITICAL: BEFORE registering anything, switch the audit fallback logger
// to silent. The MCP stdio transport uses stderr for logging notifications
// in the JSON-RPC framing channel; raw stderr writes from `safeAudit` would
// corrupt the protocol stream.

export interface CreateMcpServerOptions {
  readonly name?: string;
  readonly version?: string;
  /** When true (default), switches audit fallback to silent at construction. */
  readonly silenceAuditFallback?: boolean;
}

// P1-004 — MCP server identity is the protocol-level handle and stays "ocn"
// (separate from the npm package name "o-coding-navigation"). The version,
// however, must track package.json so MCP hosts and bug reports see the
// real shipped version rather than a stale literal.
export const MCP_SERVER_DEFAULT_INFO = Object.freeze({
  name: "ocn",
  version: PACKAGE_VERSION,
});

export function createMcpServer(opts: CreateMcpServerOptions = {}): McpServer {
  if (opts.silenceAuditFallback ?? true) {
    setAuditFallbackLogger(silentAuditFallbackLogger);
  }

  const server = new McpServer(
    {
      name: opts.name ?? MCP_SERVER_DEFAULT_INFO.name,
      version: opts.version ?? MCP_SERVER_DEFAULT_INFO.version,
    },
    {
      capabilities: { tools: {} },
      instructions:
        "OCN MCP Server — exposes 7 read-and-create tools. State advancement, " +
        "decision capture, project reset, and force-release-lock are NOT exposed " +
        "and must be performed via the OCN CLI by a human.",
    },
  );

  for (const tool of ALLOWED_TOOLS) {
    // The SDK's registerTool generics tighten `InputArgs` based on the
    // inputSchema shape; our tool definitions use ZodRawShape but the
    // `Record<string, unknown>` declaration in tools/index.ts loses that
    // type. Cast through `unknown` so the loop stays generic over the 7
    // tool definitions while the SDK still validates inputs at call time.
    const registerToolFn = server.registerTool.bind(server) as (
      name: string,
      config: { description: string; inputSchema: unknown },
      cb: (args: unknown) => Promise<unknown>,
    ) => unknown;

    registerToolFn(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputShape,
      },
      async (args) => {
        const result = await tool.handler(args ?? {});
        return toCallToolResult(result);
      },
    );
  }

  return server;
}

export async function runMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
