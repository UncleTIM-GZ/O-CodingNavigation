import type { RequiredSectionDef } from "./artifact.js";

export interface SopProfile {
  readonly id: string;
  readonly version: string;
  readonly sopYaml: string;
  readonly gatesYaml: string;
  readonly artifactsYaml: string;
  readonly defaultConfigYaml: string;
  readonly requiredSectionsForStep: (stepId: string) => readonly RequiredSectionDef[];
}
