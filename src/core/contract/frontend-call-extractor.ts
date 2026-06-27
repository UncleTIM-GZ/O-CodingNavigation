import type * as TS from "typescript";
import type { FrontendCall, HttpMethod } from "../../types/api-contract.js";

// Deterministic AST extraction of frontend HTTP call sites (AM-012 D2/D4). Uses
// the TypeScript compiler API — NOT regex. `ts` is dependency-injected (caller
// loads it via dynamic import) so this module carries no runtime dependency on
// the `typescript` package and stays a pure, synchronous function.
//
// Invariant: a call is `certain` only when BOTH method and path are statically
// determinate. Anything else degrades to `inferred`, which can never hard-block
// downstream — so a fail-closed gate never becomes false-closed.
//
// v1 recognizes `fetch(...)`, `axios.<verb>(...)`, and `axios({...})` only.
// Wrapped/factory clients are an explicit coverage gap (Non-goals), preferred
// over guessing.

type TsModule = typeof TS;

const VERBS: Record<string, HttpMethod> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
  head: "HEAD",
  options: "OPTIONS",
};

// A path that is structurally determinate, or one that is not (a guess).
interface PathInfo {
  readonly path: string;
  readonly determinate: boolean;
}

const INTERP = "\u0000"; // sentinel for a template interpolation

function templatePath(node: TS.TemplateExpression): PathInfo {
  let raw = node.head.text;
  for (const span of node.templateSpans) raw += INTERP + span.literal.text;
  let determinate = true;
  const out = raw.split("/").map((seg) => {
    if (seg === INTERP) return ":param"; // whole-segment param → wildcard
    if (seg.includes(INTERP)) {
      determinate = false; // partial interpolation — not statically determinate
      return seg.split(INTERP).join(":param");
    }
    return seg;
  });
  return { path: out.join("/"), determinate };
}

// The path argument, or null when no path literal/template is present at all.
function readPath(ts: TsModule, arg: TS.Expression | undefined): PathInfo | null {
  if (arg === undefined) return null;
  if (ts.isStringLiteralLike(arg)) return { path: arg.text, determinate: true };
  if (ts.isTemplateExpression(arg)) return templatePath(arg);
  return null;
}

// "present-and-literal" → the value; "absent" → undefined; "present-non-literal"
// → null (forces inferred).
function stringProp(
  ts: TsModule,
  obj: TS.Expression | undefined,
  name: string,
): string | null | undefined {
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return undefined;
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = prop.name;
    const keyText = ts.isIdentifier(key) || ts.isStringLiteralLike(key) ? key.text : undefined;
    if (keyText !== name) continue;
    return ts.isStringLiteralLike(prop.initializer) ? prop.initializer.text : null;
  }
  return undefined;
}

function methodFromOption(
  value: string | null | undefined,
  fallback: HttpMethod,
): {
  method: HttpMethod;
  determinate: boolean;
} {
  if (value === undefined) return { method: fallback, determinate: true }; // not specified → default
  if (value === null) return { method: fallback, determinate: false }; // specified but dynamic
  const verb = VERBS[value.toLowerCase()];
  return verb !== undefined
    ? { method: verb, determinate: true }
    : { method: fallback, determinate: false };
}

function buildCall(
  file: string,
  method: HttpMethod,
  pathInfo: PathInfo,
  methodDeterminate: boolean,
): FrontendCall {
  const confidence = pathInfo.determinate && methodDeterminate ? "certain" : "inferred";
  return { file, method, path: pathInfo.path, confidence };
}

// Resolve a single call expression to a FrontendCall, or null if it is not a
// recognized HTTP call (or has no usable path).
function callFrom(ts: TsModule, node: TS.CallExpression, file: string): FrontendCall | null {
  const callee = node.expression;
  const args = node.arguments;

  // fetch('<path>', { method }?)
  if (ts.isIdentifier(callee) && callee.text === "fetch") {
    const pathInfo = readPath(ts, args[0]);
    if (pathInfo === null) return null;
    const m = methodFromOption(stringProp(ts, args[1], "method"), "GET");
    return buildCall(file, m.method, pathInfo, m.determinate);
  }

  // axios.<verb>('<path>', …)
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    if (callee.expression.text !== "axios") return null;
    const verb = VERBS[callee.name.text.toLowerCase()];
    if (verb === undefined) return null;
    const pathInfo = readPath(ts, args[0]);
    if (pathInfo === null) return null;
    return buildCall(file, verb, pathInfo, true);
  }

  // axios('<path>', { method }?)  OR  axios({ method, url })
  if (ts.isIdentifier(callee) && callee.text === "axios") {
    const directPath = readPath(ts, args[0]);
    if (directPath !== null) {
      const m = methodFromOption(stringProp(ts, args[1], "method"), "GET");
      return buildCall(file, m.method, directPath, m.determinate);
    }
    const cfg = args[0];
    const urlProp = stringProp(ts, cfg, "url");
    const pathInfo: PathInfo | null =
      typeof urlProp === "string" ? { path: urlProp, determinate: true } : null;
    if (pathInfo === null) return null;
    const m = methodFromOption(stringProp(ts, cfg, "method"), "GET");
    return buildCall(file, m.method, pathInfo, m.determinate);
  }

  return null;
}

export function extractCallsFromSource(ts: TsModule, source: string, file: string): FrontendCall[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);

  const out: FrontendCall[] = [];
  const visit = (node: TS.Node): void => {
    if (ts.isCallExpression(node)) {
      const call = callFrom(ts, node, file);
      if (call !== null) out.push(call);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
