import { describe, expect, it } from "vitest";
import type { ContractEndpoint, HttpMethod } from "../../src/types/api-contract.js";
import { validateApiContract } from "../../src/core/gate/api-contract-validator.js";

// Structural well-formedness of a declared contract (AM-012 D2) — the defects
// that block the DESIGN api-contract step with ERR_ARTIFACT_INVALID (exit 2):
// duplicate id, duplicate (method, path), path missing a leading slash.

const ep = (method: HttpMethod, path: string, id: string): ContractEndpoint => ({
  id,
  method,
  path,
});

describe("validateApiContract", () => {
  it("passes a clean endpoint set", () => {
    const result = validateApiContract([
      ep("GET", "/api/users", "endpoint_list_users"),
      ep("DELETE", "/api/users/:id", "endpoint_delete_user"),
    ]);
    expect(result.status).toBe("pass");
    expect(result.issues).toEqual([]);
  });

  it("flags a duplicate endpoint id", () => {
    const result = validateApiContract([
      ep("GET", "/api/users", "endpoint_dup"),
      ep("POST", "/api/users", "endpoint_dup"),
    ]);
    expect(result.status).toBe("blocked");
    expect(result.issues.some((i) => i.code === "duplicate_id")).toBe(true);
  });

  it("flags a duplicate (method, path) route under distinct ids", () => {
    const result = validateApiContract([
      ep("GET", "/api/users", "endpoint_a"),
      ep("GET", "/api/users", "endpoint_b"),
    ]);
    expect(result.status).toBe("blocked");
    expect(result.issues.some((i) => i.code === "duplicate_route")).toBe(true);
  });

  it("flags a path missing a leading slash", () => {
    const result = validateApiContract([ep("GET", "api/users", "endpoint_list_users")]);
    expect(result.status).toBe("blocked");
    expect(result.issues.some((i) => i.code === "path_missing_leading_slash")).toBe(true);
  });

  it("allows :param wildcard segments in a path", () => {
    const result = validateApiContract([ep("PATCH", "/api/users/:id", "endpoint_update_user")]);
    expect(result.status).toBe("pass");
  });
});
