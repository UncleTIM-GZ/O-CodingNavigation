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
  // SOP 0.5.0 (AM-007) — task backbone ledger (frozen verify commands +
  // per-task done/pending status; regenerated on every passing build-plan gate).
  taskLedgerFile: (root: string): string => join(root, ".ocoding", "task-ledger.json"),
  // SOP 0.8.0 (AM-015) — acceptance backbone projection (frozen validated
  // acceptance specs; regenerated on every passing acceptance-criteria gate).
  acceptanceSpecsFile: (root: string): string => join(root, ".ocoding", "acceptance-specs.json"),
  // SOP 0.9.0 (AM-017) — outcome backbone ledger (frozen measure.command hashes
  // + append-only measurement history; written under the state-store lock). The
  // contract is frozen as a side-effect of the acceptance gate passing; history
  // is appended only by `ocn outcome check` running the frozen command.
  outcomeLedgerFile: (root: string): string => join(root, ".ocoding", "outcome-ledger.json"),
  // AM-012 (Contract Backbone) — declared-vs-wired API surface projection
  // (machine source of truth; regenerated whenever the contract drift gate runs).
  contractGraphFile: (root: string): string => join(root, ".ocoding", "contract-graph.json"),
  // AM-009 — auto-mode machine state (circuit breaker), separate from the
  // human-intent `automation:` block in config.yaml.
  automationRuntimeFile: (root: string): string =>
    join(root, ".ocoding", "automation-runtime.json"),
  docsDir: (root: string): string => join(root, "docs"),
  prdFile: (root: string): string => join(root, "docs", "02-prd.md"),
  // AM-006 — Claude Code agent integration surface (written by `ocn agent setup`).
  claudeDir: (root: string): string => join(root, ".claude"),
  claudeSettings: (root: string): string => join(root, ".claude", "settings.json"),
  claudeOcnMd: (root: string): string => join(root, ".claude", "ocn.md"),
  claudeCommandsDir: (root: string): string => join(root, ".claude", "commands"),
  claudeOcnNextCommand: (root: string): string => join(root, ".claude", "commands", "ocn-next.md"),
  projectClaudeMd: (root: string): string => join(root, "CLAUDE.md"),
} as const;
