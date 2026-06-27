import type { ContractEndpoint } from "../../types/api-contract.js";

// Validates a parsed API contract for the structural defects that block the
// DESIGN api-contract step with ERR_ARTIFACT_INVALID (exit 2) — AM-012 D2. Pure
// function; mirrors the contract of validateLogicBackbone (src/core/gate/
// logic-backbone-validator.ts). Invalid HTTP methods are already rejected by
// the schema in the parser, so they never reach here.

export type ApiContractIssueCode =
  | "duplicate_id"
  | "duplicate_route"
  | "path_missing_leading_slash";

export interface ApiContractIssue {
  readonly code: ApiContractIssueCode;
  /** The offending endpoint id, when the defect is endpoint-scoped. */
  readonly endpointId?: string;
  /** Supporting references — the duplicated route, etc. */
  readonly refs?: readonly string[];
}

export interface ApiContractValidation {
  readonly status: "pass" | "blocked";
  readonly issues: readonly ApiContractIssue[];
}

function checkDuplicateIds(endpoints: readonly ContractEndpoint[]): ApiContractIssue[] {
  const seen = new Set<string>();
  const issues: ApiContractIssue[] = [];
  for (const ep of endpoints) {
    if (seen.has(ep.id)) {
      issues.push({ code: "duplicate_id", endpointId: ep.id });
    }
    seen.add(ep.id);
  }
  return issues;
}

function checkDuplicateRoutes(endpoints: readonly ContractEndpoint[]): ApiContractIssue[] {
  const seen = new Set<string>();
  const issues: ApiContractIssue[] = [];
  for (const ep of endpoints) {
    const route = `${ep.method} ${ep.path}`;
    if (seen.has(route)) {
      issues.push({ code: "duplicate_route", endpointId: ep.id, refs: [route] });
    }
    seen.add(route);
  }
  return issues;
}

function checkLeadingSlash(endpoints: readonly ContractEndpoint[]): ApiContractIssue[] {
  return endpoints
    .filter((ep) => !ep.path.startsWith("/"))
    .map((ep) => ({ code: "path_missing_leading_slash" as const, endpointId: ep.id, refs: [ep.path] }));
}

export function validateApiContract(
  endpoints: readonly ContractEndpoint[],
): ApiContractValidation {
  const issues = [
    ...checkDuplicateIds(endpoints),
    ...checkDuplicateRoutes(endpoints),
    ...checkLeadingSlash(endpoints),
  ];
  return { status: issues.length === 0 ? "pass" : "blocked", issues };
}
