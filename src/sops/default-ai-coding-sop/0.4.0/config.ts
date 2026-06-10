// SOP 0.4.0 bundled default config. NOT the runtime default yet (the default
// stays 0.3.0; cutover is a separate DEC) — written only when a project is
// initialized explicitly with `ocn init --sop-version 0.4.0`.
//
// `commands` feeds the readiness repo probes (R4): build/test commands are
// project facts the engine executes itself. Empty string = unconfigured →
// the corresponding probes report UNKNOWN (open world), never PASS.
export const defaultConfigYaml = `project:
  tier: minimal
  language: zh
sopProfile:
  id: default-ai-coding-sop
  version: 0.4.0
commands:
  build: ""
  test: ""
`;
