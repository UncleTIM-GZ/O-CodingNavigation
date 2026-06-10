import { DERIVED_CHECK_FIELDS, type ReadinessRulebook } from "../../types/readiness.js";

// SOP 0.4.0 — rulebook meta-validator (`ocn sop lint` core). The rulebook is
// itself an artifact that drifts: a dry run of these exact checks on draft
// v0.3.0 found 19 real requires/check mismatches. An unlinted rulebook turns
// into mass false-UNKNOWN at runtime (open world: unresolvable inputs block),
// so this lint is a build prerequisite — the shipped rulebook is linted in CI
// via the shipped-rulebook test.

export type RulebookLintCode =
  | "duplicate_check_id"
  | "unresolvable_artifact_ref"
  | "unresolvable_probe_ref"
  | "malformed_require"
  | "check_field_not_in_requires"
  | "waivable_false_mentions_waived";

export interface RulebookLintFinding {
  readonly code: RulebookLintCode;
  readonly checkId: string;
  readonly detail: string;
}

function lintRequires(
  rulebook: ReadinessRulebook,
  checkId: string,
  requires: readonly string[],
): RulebookLintFinding[] {
  const findings: RulebookLintFinding[] = [];
  for (const ref of requires) {
    if (ref.startsWith("repo.")) {
      const probe = ref.slice("repo.".length);
      if (rulebook.repo_probes[probe] === undefined) {
        findings.push({
          code: "unresolvable_probe_ref",
          checkId,
          detail: `requires "${ref}" but repo_probes has no "${probe}"`,
        });
      }
    } else if (/^artifact_[a-z0-9_]+\.[a-z0-9_]+$/.test(ref)) {
      const slug = ref.split(".", 1)[0] ?? "";
      if (rulebook.artifact_aliases[slug] === undefined) {
        findings.push({
          code: "unresolvable_artifact_ref",
          checkId,
          detail: `requires "${ref}" but artifact_aliases has no "${slug}"`,
        });
      }
    } else {
      findings.push({
        code: "malformed_require",
        checkId,
        detail: `"${ref}" is neither repo.<fact> nor artifact_<slug>.<field>`,
      });
    }
  }
  return findings;
}

/**
 * Check-field discipline: every `check` field must be derivable from the
 * rule's declared inputs — an artifact field named in `requires`, a repo fact
 * named in `requires` (or a content check on a repo file when ALL requires
 * are repo facts), or an engine-derived field. Anything else is the drift
 * class that produces permanent false-UNKNOWN.
 */
function lintCheckFields(checkId: string, rule: ReadinessRulebook["checks"][number]): RulebookLintFinding[] {
  const findings: RulebookLintFinding[] = [];
  const artifactFields = new Set(
    rule.requires
      .filter((r) => !r.startsWith("repo."))
      .map((r) => r.split(".").slice(1).join("."))
      .filter((f) => f.length > 0),
  );
  const repoFacts = new Set(
    rule.requires.filter((r) => r.startsWith("repo.")).map((r) => r.slice("repo.".length)),
  );
  const allRepoOrEmpty = rule.requires.every((r) => r.startsWith("repo."));
  for (const field of Object.keys(rule.check)) {
    if (DERIVED_CHECK_FIELDS.has(field)) continue;
    if (artifactFields.has(field) || repoFacts.has(field)) continue;
    if (allRepoOrEmpty) continue; // content check on a repo-probed file (e.g. README sections)
    findings.push({
      code: "check_field_not_in_requires",
      checkId,
      detail: `check field "${field}" is not declared in requires (would evaluate as permanent UNKNOWN)`,
    });
  }
  return findings;
}

export function lintReadinessRulebook(rulebook: ReadinessRulebook): readonly RulebookLintFinding[] {
  const findings: RulebookLintFinding[] = [];
  const seen = new Set<string>();
  for (const rule of rulebook.checks) {
    if (seen.has(rule.id)) {
      findings.push({ code: "duplicate_check_id", checkId: rule.id, detail: "id appears twice" });
    }
    seen.add(rule.id);
    findings.push(...lintRequires(rulebook, rule.id, rule.requires));
    findings.push(...lintCheckFields(rule.id, rule));
    if (rule.waivable === false) {
      const hint = `${rule.fix_hint.zh} ${rule.fix_hint.en}`;
      if (/WAIVED/i.test(hint)) {
        findings.push({
          code: "waivable_false_mentions_waived",
          checkId: rule.id,
          detail: "waivable:false but fix_hint offers WAIVED as an exit",
        });
      }
    }
  }
  return findings;
}
