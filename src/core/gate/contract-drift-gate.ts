import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { ContractConfig, ContractEndpoint, ContractGraph } from "../../types/api-contract.js";
import type { BilingualMessage } from "../../types/i18n.js";
import type { FailureCode } from "../../types/result.js";
import { parseApiContract } from "../artifact/api-contract-parser.js";
import { collectFrontendCalls } from "../contract/frontend-call-collector.js";
import { buildContractGraph } from "../contract/contract-graph-store.js";
import { isBlocking, validateContractDrift } from "../contract/contract-drift.js";
import { msg } from "../i18n.js";
import { validateApiContract } from "./api-contract-validator.js";

// AM-012 D2-D7 — the cross-cutting drift gate orchestration. Runs only when the
// project has opted in (config.enabled) and only inside BUILD/VERIFY. Returns a
// discriminated outcome the gate-runner maps onto a CommandResult: `skip` (no
// gate), `pass` (+ projection to persist), or `blocked` (+ failure code). The
// declared contract is the oracle; the frontend scan is read-only evidence.

const BUILD_VERIFY: ReadonlySet<string> = new Set(["state_build", "state_verify"]);

/** The contract drift gate can only fire inside BUILD/VERIFY. Exposed so callers
 *  can short-circuit (and skip the config read) for every other phase. */
export function isContractGateState(stateId: string): boolean {
  return BUILD_VERIFY.has(stateId);
}

export interface ContractSummary {
  readonly endpoints: number;
  readonly calls: number;
  readonly undeclared: number;
  readonly methodMismatch: number;
  readonly unverified: number;
}

export type ContractDriftOutcome =
  | { readonly kind: "skip"; readonly reason: string }
  | { readonly kind: "pass"; readonly graph: ContractGraph; readonly summary: ContractSummary }
  | {
      readonly kind: "blocked";
      readonly failureCode: FailureCode;
      readonly message: BilingualMessage;
      readonly blockingReasons: readonly string[];
      readonly graph?: ContractGraph;
    };

export interface EvaluateContractDriftOptions {
  readonly cwd: string;
  readonly stateId: string;
  readonly config: ContractConfig;
  /** false for read-only callers (MCP) — the frontend is not scanned. */
  readonly executeScan?: boolean;
}

/** Reduce a projected graph to the compact coverage summary shared by the gate
 *  message and `ocn brief` (single source of truth — never re-implement). */
export function summarizeContractGraph(graph: ContractGraph): ContractSummary {
  const by = (k: string): number => graph.violations.filter((v) => v.kind === k).length;
  return {
    endpoints: graph.endpoints.length,
    calls: graph.calls.length,
    undeclared: by("undeclared_call"),
    methodMismatch: by("method_mismatch"),
    unverified: by("unverified_call"),
  };
}

type DeclaredResult =
  | { readonly ok: true; readonly endpoints: readonly ContractEndpoint[] }
  | { readonly ok: false; readonly outcome: ContractDriftOutcome };

// The declared contract is the single source of truth. Absent / empty / malformed
// block ⇒ ERR_ARTIFACT_INVALID (exit 2): opting in means the block must exist.
async function loadDeclaredContract(cwd: string, config: ContractConfig): Promise<DeclaredResult> {
  let declarationText: string;
  try {
    declarationText = await fs.readFile(join(cwd, config.declaration), "utf8");
  } catch {
    return {
      ok: false,
      outcome: blockedInvalid(
        msg(
          `Contract enabled but the declaration doc is missing: ${config.declaration}.`,
          `已开启契约门但声明文档缺失：${config.declaration}。`,
        ),
      ),
    };
  }

  const parsed = parseApiContract(declarationText);
  if (!parsed.found || parsed.contract === null) {
    const detail = parsed.errors.length > 0 ? ` (${parsed.errors.join("; ")})` : "";
    return {
      ok: false,
      outcome: blockedInvalid(
        msg(
          `No valid ocn-api-contract block in ${config.declaration}${detail}.`,
          `${config.declaration} 中无有效的 ocn-api-contract 声明块${detail}。`,
        ),
      ),
    };
  }

  const structural = validateApiContract(parsed.contract.endpoints);
  if (structural.status === "blocked") {
    const codes = structural.issues.map((i) => i.code).join(", ");
    return {
      ok: false,
      outcome: blockedInvalid(
        msg(
          `Declared contract has structural defects: ${codes}.`,
          `声明契约存在结构缺陷：${codes}。`,
        ),
      ),
    };
  }

  return { ok: true, endpoints: parsed.contract.endpoints };
}

export async function evaluateContractDrift(
  opts: EvaluateContractDriftOptions,
): Promise<ContractDriftOutcome> {
  const { cwd, stateId, config } = opts;
  if (!config.enabled) return { kind: "skip", reason: "disabled" };
  if (!isContractGateState(stateId)) return { kind: "skip", reason: "not_build_verify" };

  const declared = await loadDeclaredContract(cwd, config);
  if (!declared.ok) return declared.outcome;

  // Read-only callers (MCP) cannot run the scan. Report `contract_unverified`
  // (fail-closed — parity with readiness's UNKNOWN-blocks rule) instead of a
  // fail-open pass that would let an agent read "no drift" without evidence.
  if (opts.executeScan === false) return blockedUnverified();

  // Frontend evidence (read-only). Containment / IO failure ⇒ ERR_IO_OR_CONFIG.
  let collected;
  try {
    collected = await collectFrontendCalls(join(cwd, config.frontendRoot), { projectRoot: cwd });
  } catch (err) {
    return blockedScanFailed(err as Error);
  }
  // No frontend root yet ⇒ no call sites to prove drift ⇒ skip (fail-safe).
  if (!collected.rootExists) return { kind: "skip", reason: "frontend_root_absent" };
  // Optional peer dep absent ⇒ cannot extract ⇒ cannot prove drift ⇒ do not block.
  if (!collected.tsAvailable) return { kind: "skip", reason: "typescript_unavailable" };

  const violations = validateContractDrift(declared.endpoints, collected.calls, {
    ...(config.basePath !== undefined ? { basePath: config.basePath } : {}),
  });
  const graph = buildContractGraph(declared.endpoints, collected.calls, violations);
  const summary = summarizeContractGraph(graph);

  const blocking = violations.filter((v) => isBlocking(v.kind));
  if (blocking.length > 0) return blockedDrift(blocking.length, summary, graph);

  return { kind: "pass", graph, summary };
}

function blockedInvalid(message: BilingualMessage): ContractDriftOutcome {
  return {
    kind: "blocked",
    failureCode: "ERR_ARTIFACT_INVALID",
    message,
    blockingReasons: ["contract_block_invalid"],
  };
}

function blockedUnverified(): ContractDriftOutcome {
  return {
    kind: "blocked",
    failureCode: "ERR_GATE_FAILED",
    message: msg(
      "Contract drift cannot be verified on a read-only call (frontend not scanned); run `ocn gate` to verify.",
      "只读调用无法验证前端契约漂移（未扫描前端），请运行 `ocn gate` 验证。",
    ),
    blockingReasons: ["contract_unverified"],
  };
}

function blockedScanFailed(err: Error): ContractDriftOutcome {
  return {
    kind: "blocked",
    failureCode: "ERR_IO_OR_CONFIG",
    message: msg(`Frontend scan failed: ${err.message}`, `前端扫描失败：${err.message}`),
    blockingReasons: ["contract_scan_failed"],
  };
}

function blockedDrift(
  count: number,
  summary: ContractSummary,
  graph: ContractGraph,
): ContractDriftOutcome {
  return {
    kind: "blocked",
    failureCode: "ERR_GATE_FAILED",
    message: msg(
      `Contract drift: ${count} blocking violation(s) — ${summary.undeclared} undeclared, ${summary.methodMismatch} method-mismatch.`,
      `契约漂移：${count} 项阻断违规——未声明 ${summary.undeclared}、方法不符 ${summary.methodMismatch}。`,
    ),
    blockingReasons: ["contract_drift"],
    graph,
  };
}
