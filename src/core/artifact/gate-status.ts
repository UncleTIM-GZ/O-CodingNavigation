import type {
  ArtifactGateStatus,
  Heading,
  RequiredSectionDef,
} from "../../types/artifact.js";
import { matchSection } from "./required-section-matcher.js";

export interface ComputeArtifactGateStatusInput {
  artifactPath: string;
  headings: readonly Heading[];
  required: readonly RequiredSectionDef[];
}

export function computeArtifactGateStatus(
  input: ComputeArtifactGateStatusInput,
): ArtifactGateStatus {
  const missing = input.required
    .filter((r) => !matchSection(input.headings, r))
    .map((r) => r.id);
  return {
    artifactPath: input.artifactPath,
    // Skeleton Spike: only "pass" or "blocked" — "warning" is reserved for Phase 2.
    status: missing.length > 0 ? "blocked" : "pass",
    missingRequiredSectionIds: missing,
  };
}
