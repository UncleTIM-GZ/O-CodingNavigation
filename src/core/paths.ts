import { join } from "node:path";

// All filesystem paths relative to the project root (`opts.cwd`) are constructed here.
// Single source of truth — see .claude/anti-patterns.md §4.
export const Paths = {
  ocodingDir: (root: string): string => join(root, ".ocoding"),
  stateFile: (root: string): string => join(root, ".ocoding", "state.json"),
  sopFile: (root: string): string => join(root, ".ocoding", "sop.yaml"),
  gatesFile: (root: string): string => join(root, ".ocoding", "gates.yaml"),
  // P1-003 — `artifacts.yaml` is persisted alongside `sop.yaml`/`gates.yaml`
  // so the on-disk snapshot fully expresses the runtime profile.
  artifactsFile: (root: string): string => join(root, ".ocoding", "artifacts.yaml"),
  configFile: (root: string): string => join(root, ".ocoding", "config.yaml"),
  // SOP 0.3.0 — validated logic-backbone graph projection (machine source of
  // truth for runtime queries; regenerated whenever the gate passes).
  logicGraphFile: (root: string): string => join(root, ".ocoding", "logic-graph.json"),
  // SOP 0.4.0 (AM-004) — readiness rulebook snapshot + verdict ledger.
  readinessRulesFile: (root: string): string => join(root, ".ocoding", "readiness-rules.yaml"),
  readinessFile: (root: string): string => join(root, ".ocoding", "readiness.json"),
  // P4/P5 — conditional waivers + frozen probe-command/tier snapshot (R4).
  readinessWaiversFile: (root: string): string => join(root, ".ocoding", "readiness-waivers.yaml"),
  readinessFrozenFile: (root: string): string => join(root, ".ocoding", "readiness-frozen.json"),
  docsDir: (root: string): string => join(root, "docs"),
  prdFile: (root: string): string => join(root, "docs", "02-prd.md"),
} as const;
