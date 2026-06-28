import { describe, expect, it } from "vitest";
import type { ContractEndpoint, FrontendCall, HttpMethod } from "../../src/types/api-contract.js";
import {
  pathMatches,
  validateContractDrift,
} from "../../src/core/contract/contract-drift.js";

// Pure cross-validation of declared API endpoints against extracted frontend
// call sites (AM-012 Contract Backbone, D3-D5). The single invariant under test:
// only a `certain` call may ever produce a BLOCKing violation; an `inferred`
// call degrades to a non-blocking `unverified_call` so fail-closed never
// becomes false-closed.

const ep = (method: HttpMethod, path: string, id: string): ContractEndpoint => ({
  id,
  method,
  path,
});

const call = (
  method: HttpMethod,
  path: string,
  confidence: FrontendCall["confidence"],
  file = "src/app.tsx",
): FrontendCall => ({ file, method, path, confidence });

describe("pathMatches", () => {
  it("matches a :param segment against any concrete segment", () => {
    expect(pathMatches("/api/users/:id", "/api/users/123")).toBe(true);
  });

  it("does not match when the segment count differs", () => {
    expect(pathMatches("/api/users", "/api/users/123")).toBe(false);
    expect(pathMatches("/api/users/:id", "/api/users")).toBe(false);
  });

  it("matches identical literal paths ignoring a trailing slash", () => {
    expect(pathMatches("/api/users", "/api/users/")).toBe(true);
  });
});

describe("validateContractDrift", () => {
  it("yields no violation when a certain call matches a declared endpoint", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/api/users", "certain")];
    expect(validateContractDrift(endpoints, calls)).toEqual([]);
  });

  it("flags a certain call to an undeclared path as undeclared_call (blocking)", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/api/invoices", "certain")];
    const violations = validateContractDrift(endpoints, calls);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      kind: "undeclared_call",
      method: "GET",
      path: "/api/invoices",
      file: "src/app.tsx",
    });
  });

  it("flags a certain wrong-method call on a declared path as method_mismatch", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("DELETE", "/api/users", "certain")];
    const violations = validateContractDrift(endpoints, calls);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      kind: "method_mismatch",
      method: "DELETE",
      path: "/api/users",
      endpointId: "endpoint_list_users",
    });
  });

  it("treats a :param endpoint as matching a concrete certain call", () => {
    const endpoints = [ep("GET", "/api/users/:id", "endpoint_get_user")];
    const calls = [call("GET", "/api/users/123", "certain")];
    expect(validateContractDrift(endpoints, calls)).toEqual([]);
  });

  it("degrades an unconfirmable inferred call to unverified_call, never undeclared_call", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/api/invoices", "inferred")];
    const violations = validateContractDrift(endpoints, calls);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("unverified_call");
  });

  it("degrades an inferred method mismatch to unverified_call, not method_mismatch", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("DELETE", "/api/users", "inferred")];
    expect(validateContractDrift(endpoints, calls)[0]?.kind).toBe("unverified_call");
  });

  it("does not flag an inferred call that does cleanly match a declared endpoint", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/api/users", "inferred")];
    expect(validateContractDrift(endpoints, calls)).toEqual([]);
  });

  it("strips/joins base_path before matching (axios baseURL case)", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/users", "certain")];
    expect(validateContractDrift(endpoints, calls, { basePath: "/api" })).toEqual([]);
  });

  it("ignores query string and hash when matching", () => {
    const endpoints = [ep("GET", "/api/users", "endpoint_list_users")];
    const calls = [call("GET", "/api/users?page=1#top", "certain")];
    expect(validateContractDrift(endpoints, calls)).toEqual([]);
  });
});
