import type { BilingualMessage } from "../../types/i18n.js";
import type { FailureCode } from "../../types/result.js";
import { readContractConfig } from "./contract-config.js";
import { writeContractGraph } from "./contract-graph-store.js";
import {
  evaluateContractDrift,
  isContractGateState,
} from "../gate/contract-drift-gate.js";
import { msg } from "../i18n.js";

// AM-012 — shared orchestration for the Contract Backbone drift gate, used by
// both the gate runner (advance/gate) and `ocn check` so the two paths cannot
// drift. Reads config, evaluates drift, persists the projection on success, and
// returns a transport-neutral result; each caller maps it onto its own typed
// CommandResult and emits its own audit. Keeping this here removes the
// duplicated closure that otherwise pushed both gate files further past the
// 300-line cap.

export type ContractStepResult =
  | { readonly kind: "skip" }
  | { readonly kind: "pass" }
  | { readonly kind: "io_error"; readonly message: BilingualMessage }
  | {
      readonly kind: "blocked";
      readonly failureCode: FailureCode;
      readonly message: BilingualMessage;
      readonly blockingReasons: readonly string[];
    };

export interface ContractStepOptions {
  readonly cwd: string;
  readonly stateId: string;
  /** false for read-only callers (MCP) — drift is reported unverified. */
  readonly executeScan: boolean;
}

export async function runContractDriftStep(
  opts: ContractStepOptions,
): Promise<ContractStepResult> {
  // The gate can only fire in BUILD/VERIFY — short-circuit before touching the
  // filesystem so the other phases never pay a config.yaml read for nothing.
  if (!isContractGateState(opts.stateId)) return { kind: "skip" };

  const config = await readContractConfig(opts.cwd);
  const outcome = await evaluateContractDrift({
    cwd: opts.cwd,
    stateId: opts.stateId,
    config,
    executeScan: opts.executeScan,
  });

  if (outcome.kind === "skip") return { kind: "skip" };

  if (outcome.graph !== undefined) {
    try {
      await writeContractGraph(opts.cwd, outcome.graph);
    } catch (err) {
      return {
        kind: "io_error",
        message: msg(
          `Failed to persist contract graph projection: ${(err as Error).message}`,
          `契约图投影写入失败：${(err as Error).message}`,
        ),
      };
    }
  }

  if (outcome.kind === "pass") return { kind: "pass" };

  return {
    kind: "blocked",
    failureCode: outcome.failureCode,
    message: outcome.message,
    blockingReasons: outcome.blockingReasons,
  };
}
