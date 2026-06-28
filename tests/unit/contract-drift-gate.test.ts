import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evaluateContractDrift } from "../../src/core/gate/contract-drift-gate.js";
import type { ContractConfig } from "../../src/types/api-contract.js";

// Orchestration of the Contract Backbone drift gate (AM-012 D2-D7): config →
// declared contract → frontend scan → drift → projection, mapped to the right
// exit code. Pure logic exercised over a temp project.

const BLOCK = [
  "# API Contract",
  "",
  "```ocn-api-contract",
  "endpoints:",
  "  - id: endpoint_list_users",
  "    method: GET",
  "    path: /api/users",
  "```",
  "",
].join("\n");

const cfg = (over: Partial<ContractConfig> = {}): ContractConfig => ({
  enabled: true,
  declaration: "docs/06-api-contract.md",
  frontendRoot: "src",
  ...over,
});

describe("evaluateContractDrift", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), "ocn-gate-"));
    await fs.mkdir(join(root, "docs"), { recursive: true });
    await fs.mkdir(join(root, "src"), { recursive: true });
  });
  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const declare = (body = BLOCK) => fs.writeFile(join(root, "docs", "06-api-contract.md"), body);
  const frontend = (src: string) => fs.writeFile(join(root, "src", "app.ts"), src);

  it("skips when disabled", async () => {
    const out = await evaluateContractDrift({
      cwd: root,
      stateId: "state_build",
      config: cfg({ enabled: false }),
    });
    expect(out.kind).toBe("skip");
  });

  it("skips outside BUILD/VERIFY states", async () => {
    await declare();
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_design", config: cfg() });
    expect(out.kind).toBe("skip");
  });

  it("blocks (exit 2) when opted in but the declaration doc is missing", async () => {
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_build", config: cfg() });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_ARTIFACT_INVALID" });
  });

  it("blocks (exit 2) when the doc has no ocn-api-contract block", async () => {
    await declare("# API Contract\n\nno block\n");
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_build", config: cfg() });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_ARTIFACT_INVALID" });
  });

  it("blocks (exit 2) on a structural defect (duplicate id)", async () => {
    await declare(
      BLOCK.replace(
        "```\n",
        "  - id: endpoint_list_users\n    method: POST\n    path: /api/users\n```\n",
      ),
    );
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_build", config: cfg() });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_ARTIFACT_INVALID" });
  });

  it("passes and projects a graph when the frontend matches the contract", async () => {
    await declare();
    await frontend(`fetch('/api/users');`);
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_verify", config: cfg() });
    expect(out.kind).toBe("pass");
    if (out.kind === "pass") {
      expect(out.summary).toMatchObject({ endpoints: 1, undeclared: 0 });
      expect(out.graph.calls).toHaveLength(1);
    }
  });

  it("blocks (exit 1, contract_drift) on a certain undeclared call", async () => {
    await declare();
    await frontend(`fetch('/api/invoices');`);
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_build", config: cfg() });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_GATE_FAILED" });
    if (out.kind === "blocked") expect(out.blockingReasons).toContain("contract_drift");
  });

  it("does not block on an inferred-only mismatch (fail-closed never false-closed)", async () => {
    await declare();
    await frontend(`request('/api/invoices');`); // wrapped client → not extracted at all
    const out = await evaluateContractDrift({ cwd: root, stateId: "state_build", config: cfg() });
    expect(out.kind).toBe("pass");
  });

  it("skips when the configured frontendRoot does not exist (AM-012 review #1)", async () => {
    await declare();
    // No src/app.ts and frontendRoot points at a dir that was never created.
    const out = await evaluateContractDrift({
      cwd: root,
      stateId: "state_build",
      config: cfg({ frontendRoot: "web/src" }),
    });
    expect(out.kind).toBe("skip");
    if (out.kind === "skip") expect(out.reason).toBe("frontend_root_absent");
  });

  it("blocks read-only callers as unverified instead of fail-open pass (AM-012 review #6)", async () => {
    await declare();
    await frontend(`fetch('/api/users');`); // would pass if scanned
    const out = await evaluateContractDrift({
      cwd: root,
      stateId: "state_build",
      config: cfg(),
      executeScan: false,
    });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_GATE_FAILED" });
    if (out.kind === "blocked") expect(out.blockingReasons).toContain("contract_unverified");
  });

  it("still blocks read-only callers on a structural defect before the unverified check", async () => {
    await declare("# API Contract\n\nno block\n");
    const out = await evaluateContractDrift({
      cwd: root,
      stateId: "state_build",
      config: cfg(),
      executeScan: false,
    });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_ARTIFACT_INVALID" });
  });

  it("blocks (exit 4) when frontendRoot escapes the project root", async () => {
    await declare();
    const out = await evaluateContractDrift({
      cwd: root,
      stateId: "state_build",
      config: cfg({ frontendRoot: "../../etc" }),
    });
    expect(out).toMatchObject({ kind: "blocked", failureCode: "ERR_IO_OR_CONFIG" });
  });
});
