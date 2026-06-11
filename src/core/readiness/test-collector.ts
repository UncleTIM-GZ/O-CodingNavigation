import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// SOP 0.4.0 P3 spike — AC→test trace, the R2 way: the engine runs the
// project's test LISTING command (`commands.test_list`, e.g.
// `pytest --collect-only -q` or `npx vitest list`) and matches declared
// scenario IDs against the COLLECTED test node names. Comments never count —
// a `# AC-F01 AC-F02…` comment line is invisible to the collector, which is
// exactly the point (red-team G1).
//
// Matching is token-sequence based, not substring: "AC-F01" tokenizes to
// [ac, f01] and matches `tests/x.py::test_ac_f01_extraction` (tokens
// [tests, x, py, test, ac, f01, extraction]) but NOT test_ac_f011_* —
// prefix-collision safe without depending on any one naming convention.

export interface TestCollection {
  readonly status: "ok" | "unconfigured" | "failed";
  readonly nodes: readonly string[];
  readonly detail: string;
}

const COLLECT_TIMEOUT_MS = 120_000;

export async function collectTestNodes(
  root: string,
  testListCommand: string | undefined,
): Promise<TestCollection> {
  if (testListCommand === undefined) {
    return {
      status: "unconfigured",
      nodes: [],
      detail: "set commands.test_list in .ocoding/config.yaml (e.g. pytest --collect-only -q)",
    };
  }
  let stdout: string;
  try {
    const result = await execFileP("/bin/sh", ["-c", testListCommand], {
      cwd: root,
      timeout: COLLECT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err) {
    // pytest --collect-only exits non-zero on collection errors; some
    // listers exit 1 with output. Use stdout if present, else fail.
    const out = (err as { stdout?: string }).stdout;
    if (typeof out === "string" && out.trim().length > 0) {
      stdout = out;
    } else {
      return {
        status: "failed",
        nodes: [],
        detail: `\`${testListCommand}\` failed: ${(err as Error).message}`,
      };
    }
  }
  const nodes = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\d+ tests? collected/.test(l) && !l.startsWith("="));
  return { status: "ok", nodes, detail: `${nodes.length} test node(s) collected` };
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** True when the scenario ID's tokens appear as a consecutive token
 *  subsequence of the node name's tokens. */
export function nodeMatchesScenario(node: string, scenarioId: string): boolean {
  const want = tokens(scenarioId);
  if (want.length === 0) return false;
  const have = tokens(node);
  outer: for (let i = 0; i + want.length <= have.length; i++) {
    for (let j = 0; j < want.length; j++) {
      if (have[i + j] !== want[j]) continue outer;
    }
    return true;
  }
  return false;
}

export interface AcTraceResult {
  readonly status: "pass" | "fail" | "unknown";
  readonly note: string;
}

export function traceScenarios(
  scenarioIds: readonly string[],
  collection: TestCollection,
): AcTraceResult {
  if (collection.status === "unconfigured") {
    return { status: "unknown", note: collection.detail };
  }
  if (collection.status === "failed") {
    return { status: "fail", note: collection.detail };
  }
  if (scenarioIds.length === 0) {
    // Declaring [] must not vacuously pass (gaming resistance).
    return { status: "unknown", note: "no scenario IDs declared in the acceptance block" };
  }
  const missing = scenarioIds.filter(
    (id) => !collection.nodes.some((node) => nodeMatchesScenario(node, id)),
  );
  if (missing.length > 0) {
    return {
      status: "fail",
      note: `${missing.length}/${scenarioIds.length} scenario(s) without a collected test: ${missing.join(", ")}`,
    };
  }
  return {
    status: "pass",
    note: `all ${scenarioIds.length} scenario(s) traced to collected tests`,
  };
}
