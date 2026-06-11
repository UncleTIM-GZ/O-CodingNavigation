import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  TIER_MAP,
  type ReadinessCheckOutcome,
  type ReadinessLedger,
  type ReadinessRule,
  type ReadinessRulebook,
  type ReadinessTier,
  type ReadinessWaiver,
} from "../../types/readiness.js";
import { parseReadinessBlock } from "../artifact/readiness-block-parser.js";
import { resolveArtifactPaths } from "./artifact-resolver.js";
import { evalReadmeContentField } from "./content-extractors.js";
import { evalPredicate, isDerivedField } from "./predicate-eval.js";
import { runRepoProbe, type ProbeResult } from "./repo-prober.js";
import type { ProjectCommands } from "./project-config.js";
import { collectTestNodes, traceScenarios, type TestCollection } from "./test-collector.js";
import { runWaiverProbe } from "./waiver-probe.js";

// SOP 0.4.0 — the readiness evaluator. Open world (Reiter 1978): a check the
// engine cannot resolve is UNKNOWN and UNKNOWN blocks; silence is never pass.
// Verdict aggregation per check: any field FAIL → FAIL, else any field
// UNKNOWN → UNKNOWN, else PASS. Tier-excluded checks are NA.

export interface EvaluateReadinessOptions {
  readonly root: string;
  readonly rulebook: ReadinessRulebook;
  /** Project tier from state.json (minimal|production|full). */
  readonly projectTier: string;
  readonly commands: ProjectCommands;
  /** P4 — granted waivers (from .ocoding/readiness-waivers.yaml). */
  readonly waivers?: readonly ReadinessWaiver[];
  /** P4 — current state id; a waiver only applies in the state it was
   *  granted in (stale otherwise → re-affirm). */
  readonly currentStateId?: string;
  readonly now?: () => Date;
}

interface FieldVerdict {
  readonly status: "pass" | "fail" | "unknown";
  readonly note: string;
}

/** P3 — derived fields the engine now evaluates for real: declared scenario
 *  IDs (pointers, from the acceptance block) traced against engine-collected
 *  test node names. `impl_or_test`: a test ref satisfies; impl-ref detection
 *  is a future refinement. */
const AC_TRACE_FIELDS: ReadonlySet<string> = new Set([
  "each_acceptance_scenario_has_test_ref",
  "each_scenario_has_impl_or_test_ref",
]);

async function evalAcTraceField(
  opts: EvaluateReadinessOptions,
  field: string,
  artifactPaths: ReadonlyMap<string, string | null>,
  blockCache: Map<string, Readonly<Record<string, unknown>> | null>,
  getCollection: () => Promise<TestCollection>,
): Promise<FieldVerdict> {
  const docPath = artifactPaths.get("artifact_acceptance") ?? null;
  if (docPath === null) {
    return { status: "unknown", note: `${field}: acceptance doc not found in docs/` };
  }
  const fields = await loadBlockFields(opts.root, docPath, blockCache);
  if (fields === null) {
    return { status: "unknown", note: `${field}: ${docPath} has no ocn-readiness block` };
  }
  const scenarios = fields["scenarios"];
  if (!Array.isArray(scenarios) || !scenarios.every((s) => typeof s === "string")) {
    return {
      status: "unknown",
      note: `${field}: declare scenario IDs in the acceptance block (scenarios: ["AC-F01", …])`,
    };
  }
  const result = traceScenarios(scenarios as string[], await getCollection());
  return { status: result.status, note: `${field}: ${result.note}` };
}

/** Per-document readiness block fields, loaded lazily and cached per run. */
async function loadBlockFields(
  root: string,
  docPath: string | null,
  cache: Map<string, Readonly<Record<string, unknown>> | null>,
): Promise<Readonly<Record<string, unknown>> | null> {
  if (docPath === null) return null;
  const cached = cache.get(docPath);
  if (cached !== undefined) return cached;
  let fields: Readonly<Record<string, unknown>> | null = null;
  try {
    const content = await fs.readFile(join(root, docPath), "utf8");
    const parsed = parseReadinessBlock(content);
    fields = parsed.block?.fields ?? null;
  } catch {
    fields = null;
  }
  cache.set(docPath, fields);
  return fields;
}

function describeProbe(name: string, result: ProbeResult): FieldVerdict {
  return { status: result.status, note: `repo.${name}: ${result.detail}` };
}

async function evalArtifactField(
  opts: EvaluateReadinessOptions,
  rule: ReadinessRule,
  field: string,
  artifactPaths: ReadonlyMap<string, string | null>,
  blockCache: Map<string, Readonly<Record<string, unknown>> | null>,
): Promise<FieldVerdict> {
  const ref = rule.requires.find((r) => !r.startsWith("repo.") && r.endsWith(`.${field}`));
  const slug = ref?.split(".", 1)[0];
  const docPath = slug !== undefined ? (artifactPaths.get(slug) ?? null) : null;
  if (slug !== undefined && docPath === null) {
    return { status: "unknown", note: `${field}: doc for ${slug} not found in docs/` };
  }
  const fields = await loadBlockFields(opts.root, docPath, blockCache);
  if (fields === null) {
    return {
      status: "unknown",
      note: `${field}: ${docPath ?? "doc"} has no ocn-readiness block`,
    };
  }
  const value = fields[field];
  const predicate = rule.check[field];
  if (predicate === undefined) {
    return { status: "unknown", note: `${field}: no predicate` };
  }
  // `exists` over a declared value = the value is a project-relative path
  // pointer; the engine verifies the pointed-at file is real (R1 anchor).
  if (predicate === "exists" && typeof value === "string" && value.trim().length > 0) {
    try {
      const st = await fs.stat(join(opts.root, value.trim()));
      return st.size > 0 || st.isDirectory()
        ? { status: "pass", note: `${field}: ${value} exists` }
        : { status: "fail", note: `${field}: ${value} is empty` };
    } catch {
      return { status: "fail", note: `${field}: declared path ${value} does not exist` };
    }
  }
  const outcome = evalPredicate(predicate, value);
  return { status: outcome.status, note: `${field}: ${outcome.note}` };
}

async function evaluateRule(
  opts: EvaluateReadinessOptions,
  rule: ReadinessRule,
  tier: ReadinessTier,
  artifactPaths: ReadonlyMap<string, string | null>,
  probeCache: Map<string, ProbeResult>,
  blockCache: Map<string, Readonly<Record<string, unknown>> | null>,
  getCollection: () => Promise<TestCollection>,
  probeWaiver: (probe: string) => Promise<{ ok: boolean; detail: string }>,
): Promise<ReadinessCheckOutcome> {
  const base = {
    id: rule.id,
    role: rule.role,
    layer: rule.layer,
    severity: rule.severity,
    fixHint: rule.fix_hint,
  };
  if (!rule.tier_required.includes(tier)) {
    return { ...base, verdict: "NA", detail: `not required at tier ${tier}` };
  }

  const repoFacts = new Set(
    rule.requires.filter((r) => r.startsWith("repo.")).map((r) => r.slice("repo.".length)),
  );
  const verdicts: FieldVerdict[] = [];
  for (const field of Object.keys(rule.check)) {
    if (AC_TRACE_FIELDS.has(field)) {
      verdicts.push(await evalAcTraceField(opts, field, artifactPaths, blockCache, getCollection));
    } else if (isDerivedField(field)) {
      verdicts.push({
        status: "unknown",
        note: `${field}: engine capability not yet shipped (P3+)`,
      });
    } else if (repoFacts.has(field)) {
      const probe = opts.rulebook.repo_probes[field];
      if (probe === undefined) {
        verdicts.push({ status: "unknown", note: `${field}: probe not defined` });
        continue;
      }
      let result = probeCache.get(field);
      if (result === undefined) {
        result = await runRepoProbe(opts.root, field, probe, opts.commands);
        probeCache.set(field, result);
      }
      verdicts.push(describeProbe(field, result));
    } else if (rule.requires.every((r) => r.startsWith("repo."))) {
      // Content check on a repo-probed file (README fields). P3: dedicated
      // deterministic extractors; fields without one stay UNKNOWN.
      const readmeProbe = opts.rulebook.repo_probes["readme"];
      const patterns =
        readmeProbe !== undefined && readmeProbe.type === "path" ? readmeProbe.any : ["README*"];
      const content = await evalReadmeContentField(opts.root, field, patterns);
      verdicts.push({ status: content.status, note: content.note });
    } else {
      verdicts.push(await evalArtifactField(opts, rule, field, artifactPaths, blockCache));
    }
  }

  const failed = verdicts.filter((v) => v.status === "fail");
  const unknown = verdicts.filter((v) => v.status === "unknown");
  const verdict = failed.length > 0 ? "FAIL" : unknown.length > 0 ? "UNKNOWN" : "PASS";
  const detail = verdicts.map((v) => v.note).join("; ");
  return applyWaiver(opts, rule, { ...base, verdict, detail }, probeWaiver);
}

/**
 * P4 — conditional waivers, applied AFTER aggregation and only to
 * FAIL/UNKNOWN. Apply-time re-validation is deliberate: even if an AI edits
 * .ocoding/readiness-waivers.yaml directly (bypassing the CLI's checks), a
 * `waivable:false` rule is still never waived, a stale-state waiver still
 * expires, and the precondition probe still runs on every evaluation. The
 * `readiness_waived` audit event (emitted only by `ocn readiness waive`) is
 * the single legitimate grant trail — WAIVED in the ledger with no matching
 * audit event is a tamper signal (future `ocn doctor` check).
 */
async function applyWaiver(
  opts: EvaluateReadinessOptions,
  rule: ReadinessRule,
  outcome: ReadinessCheckOutcome,
  probeWaiver: (probe: string) => Promise<{ ok: boolean; detail: string }>,
): Promise<ReadinessCheckOutcome> {
  if (outcome.verdict !== "FAIL" && outcome.verdict !== "UNKNOWN") return outcome;
  const waiver = opts.waivers?.find((w) => w.checkId === rule.id);
  if (waiver === undefined) return outcome;
  if (rule.waivable === false) {
    return { ...outcome, detail: `${outcome.detail}; waiver ignored: check is not waivable` };
  }
  if (opts.currentStateId === undefined || waiver.stateId !== opts.currentStateId) {
    return {
      ...outcome,
      detail: `${outcome.detail}; waiver expired (granted in ${waiver.stateId} — re-affirm with \`ocn readiness waive\`)`,
    };
  }
  const probe = await probeWaiver(waiver.probe);
  if (!probe.ok) {
    return { ...outcome, detail: `${outcome.detail}; waiver voided: ${probe.detail}` };
  }
  return {
    ...outcome,
    verdict: "WAIVED",
    detail: `${outcome.detail}; waived: ${waiver.reason} (${probe.detail})`,
    waived: { reason: waiver.reason, grantedAt: waiver.grantedAt },
  };
}

export async function evaluateReadiness(opts: EvaluateReadinessOptions): Promise<ReadinessLedger> {
  const tier: ReadinessTier = TIER_MAP[opts.projectTier] ?? "solo";
  const artifactPaths = await resolveArtifactPaths(opts.root, opts.rulebook.artifact_aliases);
  const probeCache = new Map<string, ProbeResult>();
  const blockCache = new Map<string, Readonly<Record<string, unknown>> | null>();
  // Lazy, once-per-run test collection (only runs when an AC-trace field is
  // actually evaluated at this tier).
  let collection: Promise<TestCollection> | null = null;
  const getCollection = (): Promise<TestCollection> =>
    (collection ??= collectTestNodes(opts.root, opts.commands.test_list));
  // P4 — waiver precondition probes, deduped per probe command per run.
  const waiverProbeCache = new Map<string, Promise<{ ok: boolean; detail: string }>>();
  const probeWaiver = (probe: string): Promise<{ ok: boolean; detail: string }> => {
    let cached = waiverProbeCache.get(probe);
    if (cached === undefined) {
      cached = runWaiverProbe(opts.root, probe);
      waiverProbeCache.set(probe, cached);
    }
    return cached;
  };

  const checks: ReadinessCheckOutcome[] = [];
  for (const rule of opts.rulebook.checks) {
    checks.push(
      await evaluateRule(
        opts,
        rule,
        tier,
        artifactPaths,
        probeCache,
        blockCache,
        getCollection,
        probeWaiver,
      ),
    );
  }
  const now = opts.now ?? ((): Date => new Date());
  return {
    evaluatedAt: now().toISOString(),
    tier,
    rulebookVersion: opts.rulebook.version,
    checks,
  };
}
