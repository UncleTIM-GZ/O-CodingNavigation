import { acceptanceCriteriaTemplate } from "./acceptance-criteria.js";
import { prdTemplate } from "./prd.js";
import { projectBriefTemplate } from "./project-brief.js";
import { scopeTemplate } from "./scope.js";
import { technicalArchitectureTemplate } from "./technical-architecture.js";

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

export type DocType =
  | "project-brief"
  | "scope"
  | "prd"
  | "acceptance-criteria"
  | "technical-architecture";

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
};

export const DOC_TYPES: readonly DocType[] = Object.keys(REGISTRY) as DocType[];

export function isDocType(s: string): s is DocType {
  return s in REGISTRY;
}

export function getTemplate(type: DocType): TemplateEntry {
  return REGISTRY[type];
}
