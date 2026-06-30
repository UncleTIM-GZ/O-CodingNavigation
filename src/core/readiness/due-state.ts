import type { StateId } from "../../types/state.js";
import type { SopProfile } from "../../types/sop.js";
import type { ReadinessRule, ReadinessRulebook } from "../../types/readiness.js";
import { globToRegExp } from "./artifact-resolver.js";

// AM-014 — just-in-time readiness activation, at STEP granularity. A block
// check's enforcement deadline `dueStep(rule)` is the LATEST step (in the
// SOP's global step order) among all of its inputs:
//   - artifact dep  → the step that produces that doc (earliest step whose
//                     declared artifact path matches the slug glob),
//   - repo-probe dep → the first step of an explicit policy state (probes own
//                     no SOP step).
// The check is DEFERRED while currentStep < dueStep (不提前) and enforced for
// every step ≥ dueStep (不缺失 — "from due onward", never a window, so an
// obligation that comes due blocks continuously and cannot be slipped past).
// Step (not state) granularity matters: a state has several steps, and a rule
// keyed on a LATER step's artifact (e.g. PRD at step_prd) must stay deferred
// at an EARLIER step of the same state (step_scope) — otherwise it demands the
// next step's artifact prematurely.
// If ANY dep is unresolvable, dueStep is null → the rule is NOT deferred
// (enforced from the first gate, today's behavior — fail-safe re 不缺失).

// Repo facts have no owning SOP step; their deadline is policy. All current
// facts are "due once code exists" → BUILD (enforced from BUILD's first step).
const REPO_PROBE_DUE_STATE: Readonly<Record<string, StateId>> = {
  git_initialized: "state_build",
  dependency_lockfile: "state_build",
  build_passes: "state_build",
  test_dir: "state_build",
  test_command_passes: "state_build",
  ci_config: "state_build",
  dev_scripts: "state_build",
  readme: "state_build",
  license_file: "state_build",
};

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

/** Flat list of every wired step id in SOP order (state order × step order). */
export function globalStepOrder(profile: SopProfile): string[] {
  const steps: string[] = [];
  for (const stateId of profile.stateOrder) {
    for (const stepId of profile.stepsForState(stateId)) steps.push(stepId);
  }
  return steps;
}

/** Earliest step that produces a doc matching the slug's globs, or null when
 *  no declared step matches (slug has no wired owning step). */
function earliestStepForSlug(
  slug: string,
  aliases: Readonly<Record<string, readonly string[]>>,
  profile: SopProfile,
): string | null {
  const globs = aliases[slug];
  if (globs === undefined) return null;
  const res = globs.map((g) => globToRegExp(g));
  for (const stepId of globalStepOrder(profile)) {
    const path = profile.artifactPathForStep(stepId);
    if (path === null) continue;
    if (res.some((re) => re.test(basename(path)))) return stepId; // global order ⇒ earliest
  }
  return null;
}

function firstStepOfState(state: StateId, profile: SopProfile): string | null {
  const steps = profile.stepsForState(state);
  return steps.length > 0 ? (steps[0] ?? null) : null;
}

/** The step by which ALL of a rule's inputs are due (max in the global step
 *  order), or null if any dep is unresolvable (→ caller must not defer it). */
export function dueStepForRule(
  rule: ReadinessRule,
  rulebook: ReadinessRulebook,
  profile: SopProfile,
): string | null {
  const order = globalStepOrder(profile);
  let maxIdx = -1;
  for (const req of rule.requires) {
    const step: string | null = req.startsWith("repo.")
      ? firstStepOfStateOrNull(REPO_PROBE_DUE_STATE[req.slice("repo.".length)], profile)
      : earliestStepForSlug(req.split(".", 1)[0] ?? req, rulebook.artifact_aliases, profile);
    if (step === null) return null;
    const idx = order.indexOf(step);
    if (idx < 0) return null;
    maxIdx = Math.max(maxIdx, idx);
  }
  return maxIdx < 0 ? null : (order[maxIdx] ?? null);
}

function firstStepOfStateOrNull(state: StateId | undefined, profile: SopProfile): string | null {
  return state === undefined ? null : firstStepOfState(state, profile);
}

/** Map of ruleId → enforced-from STEP for BLOCK rules, when the rulebook opts
 *  into precise activation. An explicit `rule.enforced_from` (a step id)
 *  overrides the derived value. Rules with an unresolvable deadline are
 *  omitted (not deferred → enforced from the first gate). */
export function computeEnforcedFromMap(
  rulebook: ReadinessRulebook,
  profile: SopProfile,
): Map<string, string> {
  const map = new Map<string, string>();
  if (rulebook.precise_activation !== true) return map;
  for (const rule of rulebook.checks) {
    if (rule.severity !== "block") continue;
    const due = rule.enforced_from ?? dueStepForRule(rule, rulebook, profile);
    if (due !== null && due !== undefined) map.set(rule.id, due);
  }
  return map;
}
