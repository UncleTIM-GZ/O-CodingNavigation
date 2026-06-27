import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import {
  ContractGraph,
  type ContractEndpoint,
  type ContractViolation,
  type FrontendCall,
} from "../../types/api-contract.js";
import { Paths } from "../paths.js";

// Builds and persists the .ocoding/contract-graph.json projection — the machine
// source of truth for the Contract Backbone (AM-012 D7). Same atomic temp+rename
// discipline as src/core/logic/logic-graph-store.ts. The builder canonically
// orders every array and dedupes calls so a re-run produces a byte-identical
// file (a stable projection, per §4.10).

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Pure, deterministic projection: canonical ordering + call dedupe. */
export function buildContractGraph(
  endpoints: readonly ContractEndpoint[],
  calls: readonly FrontendCall[],
  violations: readonly ContractViolation[],
): ContractGraph {
  const sortedEndpoints = [...endpoints].sort((a, b) => compare(a.id, b.id));

  const seen = new Set<string>();
  const dedupedCalls: FrontendCall[] = [];
  for (const c of calls) {
    const key = `${c.method} ${c.path} ${c.file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedCalls.push(c);
  }
  dedupedCalls.sort(
    (a, b) => compare(a.file, b.file) || compare(a.method, b.method) || compare(a.path, b.path),
  );

  const sortedViolations = [...violations].sort(
    (a, b) => compare(a.kind, b.kind) || compare(a.path, b.path) || compare(a.method, b.method),
  );

  return { endpoints: sortedEndpoints, calls: dedupedCalls, violations: sortedViolations };
}

export async function writeContractGraph(root: string, graph: ContractGraph): Promise<void> {
  const file = Paths.contractGraphFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(graph, null, 2) + "\n";
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

export async function readContractGraph(root: string): Promise<ContractGraph | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.contractGraphFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = ContractGraph.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
