import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { extractCallsFromSource } from "../../src/core/contract/frontend-call-extractor.js";

// AST extraction of frontend HTTP call sites (AM-012 D2/D4) via the TypeScript
// compiler API — deterministic, not regex. The governing invariant: a call is
// `certain` only when BOTH method and path are statically determinate; anything
// else degrades to `inferred` (which can never hard-block). v1 recognizes
// `fetch` and `axios` only — wrapped clients are an explicit coverage gap.

const calls = (source: string, file = "src/app.tsx") => extractCallsFromSource(ts, source, file);

describe("extractCallsFromSource", () => {
  it("extracts a literal fetch as a certain GET", () => {
    expect(calls(`fetch('/api/users')`)).toEqual([
      { file: "src/app.tsx", method: "GET", path: "/api/users", confidence: "certain" },
    ]);
  });

  it("reads a literal method from fetch options", () => {
    const [c] = calls(`fetch('/api/users', { method: 'POST' })`);
    expect(c).toMatchObject({ method: "POST", path: "/api/users", confidence: "certain" });
  });

  it("extracts axios.<verb> with a literal path as certain", () => {
    const [c] = calls(`axios.delete('/api/users/1')`);
    expect(c).toMatchObject({ method: "DELETE", path: "/api/users/1", confidence: "certain" });
  });

  it("normalizes a whole-segment template param to :param and stays certain", () => {
    const [c] = calls("axios.get(`/api/users/${id}`)");
    expect(c).toMatchObject({ method: "GET", path: "/api/users/:param", confidence: "certain" });
  });

  it("degrades a partially-interpolated template path to inferred", () => {
    const [c] = calls("fetch(`/api/users-${id}/x`)");
    expect(c?.confidence).toBe("inferred");
  });

  it("degrades a non-literal fetch method to inferred", () => {
    const [c] = calls(`fetch('/api/users', { method: verb })`);
    expect(c).toMatchObject({ path: "/api/users", confidence: "inferred" });
  });

  it("reads method and url from an axios config object", () => {
    const [c] = calls(`axios({ method: 'PUT', url: '/api/users/1' })`);
    expect(c).toMatchObject({ method: "PUT", path: "/api/users/1", confidence: "certain" });
  });

  it("extracts axios called directly with a string path as certain GET", () => {
    const [c] = calls(`axios('/api/users')`);
    expect(c).toMatchObject({ method: "GET", path: "/api/users", confidence: "certain" });
  });

  it("does not let a space in a template segment corrupt normalization", () => {
    // Pathological but legal: a literal space adjacent to an interpolation must
    // not be mistaken for the interpolation sentinel.
    const [c] = calls("fetch(`/api/v ${id}`)");
    expect(c?.confidence).toBe("inferred");
    expect(c?.path).not.toContain(":param:param");
  });

  it("does not emit a call when no path literal is present", () => {
    expect(calls(`fetch(url)`)).toEqual([]);
  });

  it("does not emit wrapped-client calls in v1 (coverage gap, not a false match)", () => {
    expect(calls(`api.get('/api/users')`)).toEqual([]);
  });

  it("parses calls inside TSX", () => {
    const src = `function C() { return <button onClick={() => fetch('/api/ping', { method: 'POST' })} />; }`;
    const [c] = calls(src);
    expect(c).toMatchObject({ method: "POST", path: "/api/ping", confidence: "certain" });
  });
});
