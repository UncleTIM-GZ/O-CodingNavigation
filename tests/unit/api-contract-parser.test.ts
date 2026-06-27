import { describe, expect, it } from "vitest";
import { parseApiContract } from "../../src/core/artifact/api-contract-parser.js";

// Extracts and schema-parses the declared `ocn-api-contract` block from the
// DESIGN api-contract artifact (AM-012 D1/D2). Strict by design: only a fence
// tagged exactly `ocn-api-contract` is picked up — never a bare ```yaml block.

const doc = (body: string): string =>
  ["# API Contract", "", "```ocn-api-contract", body, "```", ""].join("\n");

describe("parseApiContract", () => {
  it("returns found=false when no ocn-api-contract block is present", () => {
    const result = parseApiContract("# API Contract\n\nNo block here.\n");
    expect(result.found).toBe(false);
    expect(result.contract).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("does not pick up an untagged yaml block", () => {
    const md = ["# API Contract", "", "```yaml", "endpoints: []", "```"].join("\n");
    expect(parseApiContract(md).found).toBe(false);
  });

  it("parses a well-formed block into typed endpoints", () => {
    const result = parseApiContract(
      doc(
        [
          "endpoints:",
          "  - id: endpoint_list_users",
          "    method: GET",
          "    path: /api/users",
          "  - id: endpoint_delete_user",
          "    method: DELETE",
          "    path: /api/users/:id",
        ].join("\n"),
      ),
    );
    expect(result.found).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.contract?.endpoints).toHaveLength(2);
    expect(result.contract?.endpoints[0]).toEqual({
      id: "endpoint_list_users",
      method: "GET",
      path: "/api/users",
    });
  });

  it("reports a YAML error for an unparseable block", () => {
    const result = parseApiContract(doc("endpoints: [unterminated"));
    expect(result.found).toBe(true);
    expect(result.contract).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects an invalid HTTP method via the schema", () => {
    const result = parseApiContract(
      doc(
        ["endpoints:", "  - id: endpoint_x", "    method: FETCH", "    path: /api/x"].join("\n"),
      ),
    );
    expect(result.found).toBe(true);
    expect(result.contract).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
