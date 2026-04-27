import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = resolve(here, "..", "fixtures");

export function fixturePath(...segments: string[]): string {
  return resolve(FIXTURES_ROOT, ...segments);
}

export const FixtureFiles = {
  prdMissingScenarios: () => fixturePath("artifacts", "prd-missing-scenarios.md"),
  prdWithScenarios: () => fixturePath("artifacts", "prd-with-scenarios.md"),
  validState: () => fixturePath("state", "valid-state.json"),
  invalidState: () => fixturePath("state", "invalid-state.json"),
  validMinimalProject: () => fixturePath("projects", "valid-minimal"),
  emptyProject: () => fixturePath("projects", "empty"),
  skeletonSpikeSop: () => fixturePath("sop", "skeleton-spike-sop.yaml"),
} as const;
