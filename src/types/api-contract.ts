import { z } from "zod";

// API Contract｜接口契约 — the declared-vs-wired API surface (AM-012 Contract
// Backbone). This file is the single source of truth (zod schema + inferred
// types). The contract is DECLARED in the DESIGN api-contract artifact (the
// `ocn-api-contract` block); frontend calls are EXTRACTED from source as
// evidence. The pure cross-validator in src/core/contract/contract-drift.ts
// checks the two for drift. OCN never invents endpoints.

// HTTP verbs an endpoint or call may carry.
export const HttpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
export type HttpMethod = z.infer<typeof HttpMethod>;

// How confidently a frontend call's (method, path) was determined.
//   certain   — both method and path are statically literal (may BLOCK)
//   inferred  — method or path is a best-effort guess (never blocks)
export const CallConfidence = z.enum(["certain", "inferred"]);
export type CallConfidence = z.infer<typeof CallConfidence>;

// The three drift classes (AM-012 D5). undeclared_call / method_mismatch are
// blocking; unverified_call is an advisory warning.
export const ViolationKind = z.enum(["undeclared_call", "method_mismatch", "unverified_call"]);
export type ViolationKind = z.infer<typeof ViolationKind>;

// A single declared endpoint. `path` may carry `:param` wildcard segments.
export const ContractEndpoint = z.object({
  id: z.string(), // stable string id, `endpoint_` prefixed (§4.1)
  method: HttpMethod,
  path: z.string(),
});
export type ContractEndpoint = z.infer<typeof ContractEndpoint>;

// A single extracted frontend call site.
export const FrontendCall = z.object({
  file: z.string(),
  method: HttpMethod,
  path: z.string(),
  confidence: CallConfidence,
});
export type FrontendCall = z.infer<typeof FrontendCall>;

// The declared contract — the parsed body of the `ocn-api-contract` block.
// Shape only; domain defects (duplicate id / route, missing leading slash) are
// checked by src/core/gate/api-contract-validator.ts.
export const ApiContract = z.object({
  endpoints: z.array(ContractEndpoint),
});
export type ApiContract = z.infer<typeof ApiContract>;

// A single drift finding (AM-012 D5). Produced by the cross-validator in
// src/core/contract/contract-drift.ts; severity is derived from `kind`.
export const ContractViolation = z.object({
  kind: ViolationKind,
  method: HttpMethod,
  path: z.string(),
  file: z.string(),
  endpointId: z.string().optional(),
});
export type ContractViolation = z.infer<typeof ContractViolation>;

// Opt-in configuration for the Contract Backbone, read from the `contract:`
// block of the user-owned .ocoding/config.yaml (AM-012 D5/D8). Fail-safe: an
// absent/invalid block resolves to disabled, so the gate never activates by
// accident. camelCase keys mirror the `automation:` block.
export const ContractConfig = z.object({
  enabled: z.boolean().default(false),
  /** Markdown doc carrying the `ocn-api-contract` declaration block. */
  declaration: z.string().default("docs/06-api-contract.md"),
  /** Root scanned for frontend call sites (must resolve inside the project). */
  frontendRoot: z.string().default("src"),
  /** Optional API prefix the client prepends (axios `baseURL`). */
  basePath: z.string().optional(),
});
export type ContractConfig = z.infer<typeof ContractConfig>;

// The machine source of truth persisted at .ocoding/contract-graph.json: the
// declared endpoints, the extracted calls, and the violation ledger. All three
// arrays are canonically ordered by the projection builder so the file is
// stable across runs (§4.10 / AM-012 D7).
export const ContractGraph = z.object({
  endpoints: z.array(ContractEndpoint),
  calls: z.array(FrontendCall),
  violations: z.array(ContractViolation),
});
export type ContractGraph = z.infer<typeof ContractGraph>;
