import type {
  ContractEndpoint,
  ContractViolation,
  FrontendCall,
  ViolationKind,
} from "../../types/api-contract.js";

export type { ContractViolation } from "../../types/api-contract.js";

// Pure cross-validation of declared endpoints against extracted frontend calls
// (AM-012 Contract Backbone, D3-D5). No IO, no AST — operates on already-parsed
// inputs, mirroring the contract of validateLogicBackbone (src/core/gate/
// logic-backbone-validator.ts).
//
// The single invariant: only a `certain` call may produce a BLOCKing violation
// (undeclared_call / method_mismatch). An `inferred` call that cannot be
// confirmed degrades to a non-blocking `unverified_call`, so a fail-closed gate
// never becomes false-closed.

export interface ContractDriftOptions {
  /** API prefix the frontend client prepends (e.g. axios `baseURL`). */
  readonly basePath?: string;
}

const BLOCKING_KINDS: ReadonlySet<ViolationKind> = new Set(["undeclared_call", "method_mismatch"]);

/** A violation that fails the gate (vs. an advisory warning). */
export function isBlocking(kind: ViolationKind): boolean {
  return BLOCKING_KINDS.has(kind);
}

// Split a path into significant segments, dropping query/hash, a leading slash,
// and any trailing slash. "/api/users/?page=1" → ["api", "users"].
function segments(path: string): string[] {
  const clean = path.split(/[?#]/, 1)[0] ?? path;
  return clean.split("/").filter((s) => s.length > 0);
}

function isParam(segment: string): boolean {
  return segment.startsWith(":");
}

/**
 * Structural, segment-by-segment match. A template `:param` segment matches any
 * single concrete segment; literal segments must be equal. Query strings,
 * fragments, and a trailing slash are ignored.
 */
export function pathMatches(template: string, callPath: string): boolean {
  const t = segments(template);
  const c = segments(callPath);
  if (t.length !== c.length) return false;
  return t.every((seg, i) => isParam(seg) || seg === c[i]);
}

// Apply `basePath` the way a client `baseURL` would: if the call literal does
// not already include the prefix, prepend it before matching.
function applyBasePath(callPath: string, basePath?: string): string {
  if (basePath === undefined || basePath.length === 0) return callPath;
  const base = basePath.replace(/\/+$/, "");
  if (callPath === base || callPath.startsWith(`${base}/`)) return callPath;
  const tail = callPath.startsWith("/") ? callPath : `/${callPath}`;
  return `${base}${tail}`;
}

export function validateContractDrift(
  endpoints: readonly ContractEndpoint[],
  calls: readonly FrontendCall[],
  opts: ContractDriftOptions = {},
): readonly ContractViolation[] {
  const violations: ContractViolation[] = [];

  for (const call of calls) {
    const path = applyBasePath(call.path, opts.basePath);
    const pathMatch = endpoints.find((e) => pathMatches(e.path, path));
    const exactMatch = endpoints.find((e) => e.method === call.method && pathMatches(e.path, path));

    if (exactMatch !== undefined) continue; // wired correctly

    // No exact (method, path) match. A guessed call can never block: surface it
    // as advisory only.
    if (call.confidence === "inferred") {
      violations.push({ kind: "unverified_call", method: call.method, path, file: call.file });
      continue;
    }

    if (pathMatch === undefined) {
      violations.push({ kind: "undeclared_call", method: call.method, path, file: call.file });
    } else {
      violations.push({
        kind: "method_mismatch",
        method: call.method,
        path,
        file: call.file,
        endpointId: pathMatch.id,
      });
    }
  }

  return violations;
}
