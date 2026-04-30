import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // tests/flaky/ holds tests known to be non-deterministic under full-suite
    // parallel load (DEC-013). They are runnable on demand via
    // `npm run test:flaky` (see vitest.flaky.config.ts) but must not block
    // the default publish gate.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/flaky/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/types/**", "src/index.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    pool: "forks",
    clearMocks: true,
    testTimeout: 20_000,
  },
});
