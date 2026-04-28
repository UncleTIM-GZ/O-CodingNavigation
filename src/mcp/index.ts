#!/usr/bin/env node
import { runMcpServer } from "./server.js";

// PR #5 — `ocn-mcp` bin entry. Stdio transport only.
await runMcpServer();
