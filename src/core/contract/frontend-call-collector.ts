import { promises as fs } from "node:fs";
import { join, relative, sep } from "node:path";
import type * as TS from "typescript";
import type { FrontendCall } from "../../types/api-contract.js";
import { assertPathInsideRoot } from "../security/project-root.js";
import { extractCallsFromSource } from "./frontend-call-extractor.js";

// IO walker for the Contract Backbone (AM-012 D3/D7). Loads `typescript`
// dynamically (optional peer dependency — option A), walks the frontend root for
// .ts/.tsx files (skipping vendored/generated trees), enforces project-root
// containment, and extracts call sites via the pure AST extractor. If typescript
// cannot be loaded the walk degrades gracefully (no calls, `tsAvailable: false`)
// so the gate can warn rather than block — a fail-closed gate never becomes
// false-closed on a missing optional dep.

const EXCLUDED_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".git",
  ".ocoding",
  "coverage",
]);

const SOURCE_EXT = [".ts", ".tsx"];

export interface CollectResult {
  readonly calls: readonly FrontendCall[];
  /** false when the optional `typescript` peer dep could not be loaded. */
  readonly tsAvailable: boolean;
  readonly filesScanned: number;
}

export interface CollectOptions {
  /** When set, `frontendRoot` must resolve inside this project root. */
  readonly projectRoot?: string;
}

type TsModule = typeof TS;

async function loadTypescript(): Promise<TsModule | null> {
  try {
    const mod: unknown = await import("typescript");
    const candidate = (mod as { default?: unknown }).default ?? mod;
    const ts = candidate as TsModule;
    return typeof ts.createSourceFile === "function" ? ts : null;
  } catch {
    return null;
  }
}

async function walkSourceFiles(dir: string, acc: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walkSourceFiles(full, acc);
    } else if (entry.isFile() && SOURCE_EXT.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
}

export async function collectFrontendCalls(
  frontendRoot: string,
  opts: CollectOptions = {},
): Promise<CollectResult> {
  if (opts.projectRoot !== undefined && !assertPathInsideRoot(opts.projectRoot, frontendRoot)) {
    throw new Error(`frontend root escapes the project root: ${frontendRoot}`);
  }

  const ts = await loadTypescript();
  if (ts === null) return { calls: [], tsAvailable: false, filesScanned: 0 };

  const files: string[] = [];
  await walkSourceFiles(frontendRoot, files);

  const calls: FrontendCall[] = [];
  for (const full of files) {
    const rel = relative(frontendRoot, full).split(sep).join("/");
    const source = await fs.readFile(full, "utf8");
    calls.push(...extractCallsFromSource(ts, source, rel));
  }

  return { calls, tsAvailable: true, filesScanned: files.length };
}
