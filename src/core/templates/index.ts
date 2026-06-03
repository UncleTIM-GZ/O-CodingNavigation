import { acceptanceCriteriaTemplate } from "./acceptance-criteria.js";
import { acceptanceMappingTemplate } from "./acceptance-mapping.js";
import { apiContractTemplate } from "./api-contract.js";
import { buildPlanTemplate } from "./build-plan.js";
import { changeEvidenceTemplate } from "./change-evidence.js";
import { dataModelTemplate } from "./data-model.js";
import { failureFixLogTemplate } from "./failure-fix-log.js";
import { finalBuildVerdictTemplate } from "./final-build-verdict.js";
import { implementationLogTemplate } from "./implementation-log.js";
import { informationArchitectureTemplate } from "./information-architecture.js";
import { integrationNotesTemplate } from "./integration-notes.js";
import { logicBackboneTemplate } from "./logic-backbone.js";
import { mvpPlanTemplate } from "./mvp-plan.js";
import { prdTemplate } from "./prd.js";
import { projectBriefTemplate } from "./project-brief.js";
import { regressionEvidenceTemplate } from "./regression-evidence.js";
import { scopeTemplate } from "./scope.js";
import { technicalArchitectureTemplate } from "./technical-architecture.js";
import { testStrategyTemplate } from "./test-strategy.js";
import { verificationReportTemplate } from "./verification-report.js";

// PR #4 — `ocn doc create <type>` accepts at least these 5 types per user §XI.
// Each entry maps a CLI-facing kebab-case type to:
//   - the artifact stable id (used for audit relatedArtifactIds)
//   - the project-relative artifact path (matches SopProfile.artifactPathForStep)
//   - the bilingual template content
//
// Adding a new type requires:
//   1. Append a new entry here
//   2. Update SopProfile to emit a matching step + required sections
//   3. Update tests/cli/doc-create-expanded.test.ts
//
// SOP 0.2.0 PR 2 (DEC-023): added templates for every artifact id 00-18 of
// the SOP 0.2.0 profile (5 already existed for 00-04 — backfilled with the
// extra 0.2.0 sections; 5 added for 05-09; 9 added for the new strong-gated
// build/verify steps 10-18). The runtime default profile remains 0.1.0 —
// these templates are creatable today but the new 10-18 are not yet enforced
// by the gate runner. PR 3 wires them into the runtime gate and PR 4 flips
// the default profile.

export type DocType =
  | "project-brief"
  | "scope"
  | "prd"
  | "acceptance-criteria"
  | "technical-architecture"
  | "information-architecture"
  | "data-model"
  | "api-contract"
  | "test-strategy"
  | "mvp-plan"
  | "build-plan"
  | "implementation-log"
  | "change-evidence"
  | "integration-notes"
  | "verification-report"
  | "acceptance-mapping"
  | "failure-fix-log"
  | "regression-evidence"
  | "final-build-verdict"
  | "logic-backbone";

export interface TemplateEntry {
  readonly type: DocType;
  readonly artifactId: string;
  readonly relativePath: string;
  readonly template: string;
}

const REGISTRY: Readonly<Record<DocType, TemplateEntry>> = {
  "project-brief": {
    type: "project-brief",
    artifactId: "artifact_project_brief",
    relativePath: "docs/00-project-brief.md",
    template: projectBriefTemplate,
  },
  scope: {
    type: "scope",
    artifactId: "artifact_scope",
    relativePath: "docs/01-scope.md",
    template: scopeTemplate,
  },
  prd: {
    type: "prd",
    artifactId: "artifact_prd",
    relativePath: "docs/02-prd.md",
    template: prdTemplate,
  },
  "acceptance-criteria": {
    type: "acceptance-criteria",
    artifactId: "artifact_acceptance_criteria",
    relativePath: "docs/03-acceptance-criteria.md",
    template: acceptanceCriteriaTemplate,
  },
  "technical-architecture": {
    type: "technical-architecture",
    artifactId: "artifact_technical_architecture",
    relativePath: "docs/04-technical-architecture.md",
    template: technicalArchitectureTemplate,
  },
  // SOP 0.2.0 PR 2 — design-phase fillers for the 0.2.0 profile.
  "information-architecture": {
    type: "information-architecture",
    artifactId: "artifact_information_architecture",
    relativePath: "docs/05-information-architecture.md",
    template: informationArchitectureTemplate,
  },
  "data-model": {
    type: "data-model",
    artifactId: "artifact_data_model",
    relativePath: "docs/06-data-model.md",
    template: dataModelTemplate,
  },
  "api-contract": {
    type: "api-contract",
    artifactId: "artifact_api_contract",
    relativePath: "docs/07-api-contract.md",
    template: apiContractTemplate,
  },
  "test-strategy": {
    type: "test-strategy",
    artifactId: "artifact_test_strategy",
    relativePath: "docs/08-test-strategy.md",
    template: testStrategyTemplate,
  },
  "mvp-plan": {
    type: "mvp-plan",
    artifactId: "artifact_mvp_plan",
    relativePath: "docs/09-mvp-plan.md",
    template: mvpPlanTemplate,
  },
  // SOP 0.2.0 PR 2 — strong-gated build/verify templates. Stable ids mirror
  // src/sops/default-ai-coding-sop/0.2.0/data.ts step ids (artifact_* form).
  "build-plan": {
    type: "build-plan",
    artifactId: "artifact_build_plan",
    relativePath: "docs/10-build-plan.md",
    template: buildPlanTemplate,
  },
  "implementation-log": {
    type: "implementation-log",
    artifactId: "artifact_implementation_log",
    relativePath: "docs/11-implementation-log.md",
    template: implementationLogTemplate,
  },
  "change-evidence": {
    type: "change-evidence",
    artifactId: "artifact_change_evidence",
    relativePath: "docs/12-change-evidence.md",
    template: changeEvidenceTemplate,
  },
  "integration-notes": {
    type: "integration-notes",
    artifactId: "artifact_integration_notes",
    relativePath: "docs/13-integration-notes.md",
    template: integrationNotesTemplate,
  },
  "verification-report": {
    type: "verification-report",
    artifactId: "artifact_verification_report",
    relativePath: "docs/14-verification-report.md",
    template: verificationReportTemplate,
  },
  "acceptance-mapping": {
    type: "acceptance-mapping",
    artifactId: "artifact_acceptance_mapping",
    relativePath: "docs/15-acceptance-mapping.md",
    template: acceptanceMappingTemplate,
  },
  "failure-fix-log": {
    type: "failure-fix-log",
    artifactId: "artifact_failure_fix_log",
    relativePath: "docs/16-failure-fix-log.md",
    template: failureFixLogTemplate,
  },
  "regression-evidence": {
    type: "regression-evidence",
    artifactId: "artifact_regression_evidence",
    relativePath: "docs/17-regression-evidence.md",
    template: regressionEvidenceTemplate,
  },
  "final-build-verdict": {
    type: "final-build-verdict",
    artifactId: "artifact_final_build_verdict",
    relativePath: "docs/18-final-build-verdict.md",
    template: finalBuildVerdictTemplate,
  },
  // SOP 0.3.0 — machine-verifiable logic backbone (DESIGN phase). Additive
  // slot 19 avoids renumbering the frozen 00–18 contracts; its DESIGN-phase
  // position is defined by step order in the 0.3.0 profile, not the file
  // number (file numbers are display-only per CLAUDE.md §4.1).
  "logic-backbone": {
    type: "logic-backbone",
    artifactId: "artifact_logic_backbone",
    relativePath: "docs/19-logic-backbone.md",
    template: logicBackboneTemplate,
  },
};

export const DOC_TYPES: readonly DocType[] = Object.keys(REGISTRY) as DocType[];

export function isDocType(s: string): s is DocType {
  return s in REGISTRY;
}

export function getTemplate(type: DocType): TemplateEntry {
  return REGISTRY[type];
}
