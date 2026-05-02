// DEC-023 — bundled default config shipped with the SOP 0.2.0 profile.
// Mirrors the 0.1.0 config.ts shape so future runtime wiring (PR 3 / PR 4
// of the SOP 0.2.0 6-PR sequence) can adopt 0.2.0 by switching the import
// path in src/core/sop/loader.ts. PR 1 does NOT change runtime defaults —
// `ocn init` continues to write the 0.1.0 config.
export const defaultConfigYaml = `project:
  tier: minimal
  language: zh
sopProfile:
  id: default-ai-coding-sop
  version: 0.2.0
`;
