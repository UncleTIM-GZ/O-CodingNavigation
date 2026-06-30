import type { StateId } from "../../types/state.js";
import type { SopProfile } from "../../types/sop.js";
import type { ReadinessRule, ReadinessRulebook } from "../../types/readiness.js";
import { globToRegExp } from "./artifact-resolver.js";

// AM-014 — just-in-time readiness activation. A block check's enforcement
// deadline `dueState(rule)` is the LATEST SOP state among all of its inputs:
//   - artifact dep  → the state of the step that produces that doc (earliest
//                     step whose declared artifact path matches the slug glob),
//   - repo-probe dep → an explicit policy state (probes own no SOP step).
// The check is DEFERRED while currentState < dueState (不提前) and enforced for
// every state ≥ dueState (不缺失 — "from due onward", never a window, so an
// obligation that comes due blocks continuously and cannot be slipped past).
// If ANY dep is unresolvable, dueState is null → the rule is NOT deferred
// (enforced from the first gate, today's behavior — fail-safe re 不缺失).

// Repo facts have no owning SOP step; their deadline is policy. All current
// facts are "due once code exists" → BUILD. Mapping to an early-ish state is
// safe for 不缺失 (enforced from BUILD onward, never missed).
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

/** Earliest SOP state whose step produces a doc matching the slug's globs, or
 *  null if no declared step matches (slug has no wired owning step). */
function earliestStateForSlug(
  slug: string,
  aliases: Readonly<Record<string, readonly string[]>>,
  profile: SopProfile,
): StateId | null {
  const globs = aliases[slug];
  if (globs === undefined) return null;
  const res = globs.map((g) => globToRegExp(g));
  for (const stateId of profile.stateOrder) {
    for (const stepId of profile.stepsForState(stateId)) {
      const path = profile.artifactPathForStep(stepId);
      if (path === null) continue;
      if (res.some((re) => re.test(basename(path)))) return stateId; // stateOrder ⇒ earliest
    }
  }
  return null;
}

/** The state by which ALL of a rule's inputs are due (max over deps), or null
 *  if any dep is unresolvable (→ caller must not defer the rule). */
export function dueStateForRule(
  rule: ReadinessRule,
  rulebook: ReadinessRulebook,
  profile: SopProfile,
): StateId | null {
  const order = profile.stateOrder;
  let maxIdx = -1;
  for (const req of rule.requires) {
    const state: StateId | null = req.startsWith("repo.")
      ? (REPO_PROBE_DUE_STATE[req.slice("repo.".length)] ?? null)
      : earliestStateForSlug(req.split(".", 1)[0] ?? req, rulebook.artifact_aliases, profile);
    if (state === null) return null;
    maxIdx = Math.max(maxIdx, order.indexOf(state));
  }
  return maxIdx < 0 ? null : (order[maxIdx] ?? null);
}

/** Map of ruleId → enforced-from state for BLOCK rules, when the rulebook opts
 *  into precise activation. An explicit `rule.enforced_from` overrides the
 *  derived value. Rules with an unresolvable deadline are omitted (not
 *  deferred → enforced from the first gate). */
export function computeEnforcedFromMap(
  rulebook: ReadinessRulebook,
  profile: SopProfile,
): Map<string, StateId> {
  const map = new Map<string, StateId>();
  if (rulebook.precise_activation !== true) return map;
  for (const rule of rulebook.checks) {
    if (rule.severity !== "block") continue;
    const explicit = rule.enforced_from as StateId | undefined;
    const due = explicit ?? dueStateForRule(rule, rulebook, profile);
    if (due !== null && due !== undefined) map.set(rule.id, due);
  }
  return map;
}
