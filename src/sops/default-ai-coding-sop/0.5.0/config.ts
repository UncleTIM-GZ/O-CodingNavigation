// SOP 0.5.0 bundled default config — the runtime default since DEC-032
// (task backbone cutover). Written by fresh `ocn init` and by
// `ocn init --sop-version 0.5.0`.
//
// `commands` feeds the readiness repo probes (R4): build/test commands are
// project facts the engine executes itself. Empty string = unconfigured →
// the corresponding probes report UNKNOWN (open world), never PASS.
export const defaultConfigYaml = `project:
  tier: minimal
  language: zh
sopProfile:
  id: default-ai-coding-sop
  version: 0.5.0
commands:
  build: ""
  test: ""
  test_list: ""
`;
