// SOP 0.9.0 bundled default config (AM-016 / DEC-042, Outcome Backbone).
// Written by `ocn init --sop-version 0.9.0` and, once P4b flips the runtime
// default, by a fresh `ocn init`. Identical to 0.8.0 except the pinned profile
// version (0.9.0).
//
// `commands` feeds the readiness repo probes (R4) AND the outcome measurement
// probes: build/test commands are project facts the engine executes itself.
// Empty string = unconfigured → the corresponding probes report UNKNOWN (open
// world), never PASS.
export const defaultConfigYaml = `project:
  tier: minimal
  language: zh
sopProfile:
  id: default-ai-coding-sop
  version: 0.9.0
commands:
  build: ""
  test: ""
  test_list: ""
`;
