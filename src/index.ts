// Public package API. Skeleton Spike: only types are re-exported.
// The CLI (`bin/ocn` ⇒ `dist/cli/index.js`) is the primary surface.
export type {
  BilingualMessage,
  CommandResult,
  CommandResultErrorEnvelope,
  ErrorCode,
  ProjectState,
  ProjectInfo,
  StateId,
  Tier,
  Heading,
  RequiredSectionDef,
  ArtifactStatus,
  ArtifactGateStatus,
  SopProfile,
} from "./types/index.js";
