import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildContractGraph,
  readContractGraph,
  writeContractGraph,
} from "../../src/core/contract/contract-graph-store.js";
import type {
  ContractEndpoint,
  ContractViolation,
  FrontendCall,
} from "../../src/types/api-contract.js";

// The .ocoding/contract-graph.json projection is the machine source of truth
// (AM-012 D7) and MUST be deterministic: canonical ordering + call dedupe so a
// re-run produces a byte-identical file.

const ep = (id: string, path = "/api/x"): ContractEndpoint => ({ id, method: "GET", path });
const call = (path: string, file: string): FrontendCall => ({
  file,
  method: "GET",
  path,
  confidence: "certain",
});
const vio = (kind: ContractViolation["kind"], path: string): ContractViolation => ({
  kind,
  method: "GET",
  path,
  file: "a.tsx",
});

describe("buildContractGraph", () => {
  it("sorts endpoints by id", () => {
    const graph = buildContractGraph([ep("endpoint_b"), ep("endpoint_a")], [], []);
    expect(graph.endpoints.map((e) => e.id)).toEqual(["endpoint_a", "endpoint_b"]);
  });

  it("dedupes identical (method, path, file) calls", () => {
    const graph = buildContractGraph(
      [],
      [call("/api/users", "a.tsx"), call("/api/users", "a.tsx"), call("/api/users", "b.tsx")],
      [],
    );
    expect(graph.calls).toHaveLength(2);
    expect(graph.calls.map((c) => c.file)).toEqual(["a.tsx", "b.tsx"]);
  });

  it("orders violations canonically by (kind, path, method)", () => {
    const graph = buildContractGraph(
      [],
      [],
      [
        vio("undeclared_call", "/api/z"),
        vio("method_mismatch", "/api/a"),
        vio("undeclared_call", "/api/a"),
      ],
    );
    expect(graph.violations.map((v) => `${v.kind} ${v.path}`)).toEqual([
      "method_mismatch /api/a",
      "undeclared_call /api/a",
      "undeclared_call /api/z",
    ]);
  });

  it("dedupes identical violations so the count never exceeds the calls (AM-012 review #4)", () => {
    const graph = buildContractGraph(
      [],
      [call("/api/invoices", "a.tsx"), call("/api/invoices", "a.tsx")],
      [vio("undeclared_call", "/api/invoices"), vio("undeclared_call", "/api/invoices")],
    );
    expect(graph.calls).toHaveLength(1);
    expect(graph.violations).toHaveLength(1);
  });

  it("is stable: building twice from the same input yields equal JSON", () => {
    const inputs = () =>
      buildContractGraph(
        [ep("endpoint_b"), ep("endpoint_a")],
        [call("/x", "b"), call("/x", "a")],
        [],
      );
    expect(JSON.stringify(inputs())).toEqual(JSON.stringify(inputs()));
  });
});

describe("writeContractGraph / readContractGraph", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), "ocn-contract-"));
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("round-trips a projection through .ocoding/contract-graph.json", async () => {
    const graph = buildContractGraph([ep("endpoint_a")], [call("/api/x", "a.tsx")], []);
    await writeContractGraph(root, graph);
    expect(await readContractGraph(root)).toEqual(graph);
  });

  it("returns null when the projection is absent", async () => {
    expect(await readContractGraph(root)).toBeNull();
  });
});
