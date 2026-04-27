export interface Heading {
  readonly level: number;
  readonly text: string;
  readonly line: number;
}

export interface RequiredSectionDef {
  readonly id: string;
  readonly canonical: string;
  readonly aliases: readonly string[];
  readonly allowedLevels: readonly number[];
}

export type ArtifactStatus = "pass" | "warning" | "blocked";

export interface ArtifactGateStatus {
  readonly artifactPath: string;
  readonly status: ArtifactStatus;
  readonly missingRequiredSectionIds: readonly string[];
}
