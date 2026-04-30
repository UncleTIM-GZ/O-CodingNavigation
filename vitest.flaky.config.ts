import { defineConfig } from "vitest/config";

// Quarantine config — runs ONLY tests/flaky/**/*.test.ts.
// These are tests known to be non-deterministic under full-suite parallel
// load (DEC-013) but valuable to run on demand for concurrency investigation.
//
// Invoked via: `npm run test:flaky`.
//
// Do NOT add this config to prepublishOnly or to CI's required-checks. By
// design, failures here may be flake, not real regressions.

export default defineConfig({
  test: {
    include: ["tests/flaky/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    pool: "forks",
    clearMocks: true,
    testTimeout: 20_000,
  },
});
