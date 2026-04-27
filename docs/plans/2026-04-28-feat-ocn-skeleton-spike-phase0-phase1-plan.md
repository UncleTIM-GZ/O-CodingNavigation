---
title: "feat: OCN Skeleton Spike — Phase 0 test infra + Phase 1 minimum 5-command CLI"
type: feat
status: active
date: 2026-04-28
---

# feat: OCN Skeleton Spike — Phase 0 test infra + Phase 1 minimum 5-command CLI

> **Origin**: Locked product/SOP/IA/Data/API/Test/Plan contracts in `docs/00-08`. This plan is the file-by-file build sheet for `/workflows:work`. **Per CLAUDE.md §10, never advance project state, never expose `navigator.advance_phase`, never use numeric step pointers.**

---

## 1. Overview

Build the minimum viable OCN runtime that proves **artifact-fake-completion detection**. Acceptance is binary:

```
empty dir
→ ocn init --tier minimal              ⇒ creates .ocoding/{state.json,sop.yaml,gates.yaml,config.yaml} + docs/
→ ocn status                           ⇒ prints state_spec / step_prd
→ ocn brief                            ⇒ prints state + step + AI Governance + Uncertainty Policy
→ ocn doc create prd                   ⇒ creates docs/02-prd.md from template
→ cp prd-missing-scenarios.md docs/02-prd.md && ocn check --json
   ⇒ ok=false, code=ERR_ARTIFACT_INVALID, exit=2, missingRequiredSectionIds=[section_scenarios]
→ cp prd-with-scenarios.md docs/02-prd.md && ocn check --json
   ⇒ ok=true, code=OK, exit=0
```

**Out of scope (CLAUDE.md §4.8 + docs/01-scope.md §8 + user prompt §III)**: MCP server, advance, full gate aggregation, reset, doctor, baseline, SOP upgrade, full event/lock/audit subsystems, dogfood mini-CRM, SQLite, web/TUI, LLM judge, custom SOP authoring.

---

## 2. Problem Statement

OCN's product thesis: AI Coding fails not from bad codegen, but from undisciplined process — false-completion ("file exists" mistaken for "step done") is the canonical failure mode. The Skeleton Spike's only purpose is to prove OCN can detect this on a single artifact (PRD missing `Scenarios | 使用场景`). Anything beyond that — locking, MCP, audit replay, baselines — is intentionally deferred until the spike validates the design.

`docs/08-mvp-plan.md` §2.4 states explicitly: **"failure is also a valid MVP deliverable"** if the spike exposes Data Model / API Contract / IA gaps. Therefore this plan **must produce `implementation-notes.md`** capturing every temporary simplification + every Amendment Needed flag, regardless of whether the spike passes.

---

## 3. Proposed Solution

### 3.1 Architecture (composition root only at edges)

```
                     ┌──────────────────────────────┐
                     │     CLI (commander shell)    │  src/cli/
                     │  init / status / brief /     │
                     │  doc create / check          │
                     └──────────────┬───────────────┘
                                    │  CommandResult<T>
                                    ▼
                     ┌──────────────────────────────┐
                     │       Core Engine (pure)     │  src/core/
                     │  initProject / getStatus /   │
                     │  generateBrief / createArti- │
                     │  fact / checkCurrentArtifact │
                     └──────────────┬───────────────┘
                                    │  Deps { fs, clock, sop }
                                    ▼
                     ┌──────────────────────────────┐
                     │     Adapters (boundary I/O)  │
                     │  state-store / sop-loader /  │
                     │  markdown-parser / template- │
                     │  writer / id-helpers         │
                     └──────────────────────────────┘
```

- **CLI layer** has zero business logic. It parses args, invokes the core function, and renders the `CommandResult` (text or `--json`); exit code derives from `ErrorCode`.
- **Core layer** is pure: takes `Deps` (filesystem, clock, sop loader) by injection, returns `CommandResult`. No console output, no `process.exit`. Easily testable.
- **Adapters** are the only places that touch real `node:fs` / `node:path`. Tests inject fakes.

### 3.2 Key Simplifications (must record in `implementation-notes.md`)

| Simplification | Reason | Removal trigger |
|---|---|---|
| `state.json` initial position = `state_spec / step_prd` (skip discovery + scope steps in init) | Per user spec §V — Skeleton Spike-only convenience | Phase 2 implements full state machine + ocn advance |
| State store: no lock, no backup, no temp+rename | Per user §III — full lock concurrency deferred | Phase 2 — see CLAUDE.md §4.5 |
| No audit event writes anywhere | Per user §III — full event system deferred | Phase 2 — see CLAUDE.md §4.7 |
| SOP profile bundled as TypeScript string constants instead of separate yaml assets | Avoids build-time asset-copy plumbing in spike | Phase 2 — once asset packaging is decided |
| Hand-rolled markdown heading parser (regex-based, ~30 lines) | Zero new deps; sufficient for headings only | Phase 2 — replace with `remark` + AST when sections need body parsing |
| `ocn doc create` only supports `prd` subtype | Per user §V — spike scope | Phase 2 expands |
| `ocn check` only checks current step's artifact (PRD when in step_prd) | Per user §V — spike scope | Phase 2 — multi-artifact aggregation |
| No `ocn advance`, no `runGate`, no `createBaseline`, no `runDoctor`, no `resetProject` | Explicit user §III | Phase 2 |
| MCP server: not implemented | Explicit user §III | Phase 2 (still no `advance_phase`) |

### 3.3 Critical Behavior Spec (from user prompt §X — verbatim contract)

#### Blocked path (PRD missing Scenarios)

```json
{
  "ok": false,
  "code": "ERR_ARTIFACT_INVALID",
  "message": {
    "en": "PRD is missing required section: Scenarios.",
    "zh": "PRD 缺少必填章节：Scenarios｜使用场景。"
  },
  "data": {
    "artifactPath": "docs/02-prd.md",
    "status": "blocked",
    "missingRequiredSectionIds": ["section_scenarios"]
  }
}
```
Exit code = 2.

#### Pass path (PRD with Scenarios)

```json
{
  "ok": true,
  "code": "OK",
  "message": {
    "en": "PRD passed Skeleton Spike artifact check.",
    "zh": "PRD 已通过 Skeleton Spike 产物检查。"
  }
}
```
Exit code = 0.

#### Required sections (PRD, Skeleton Spike scope)

| Section ID | Canonical heading | Aliases (case-insensitive, level 2 or 3) |
|---|---|---|
| `section_problem` | `Problem` | `Problem｜问题`, `问题` |
| `section_goals` | `Goals` | `Goals｜目标`, `目标` |
| `section_users` | `Users` | `Users｜用户`, `用户` |
| `section_scenarios` | `Scenarios` | `Scenarios｜使用场景`, `使用场景`, `Use Cases`, `User Scenarios`, `用户场景` |
| `section_requirements` | `Requirements` | `Requirements｜需求`, `需求` |

> **Note**: The fixture `prd-missing-scenarios.md` deliberately lacks **only** `section_scenarios`, so `missingRequiredSectionIds` returns exactly `["section_scenarios"]`.

---

## 4. Technical Approach (file-by-file)

> **All paths relative to `/home/timou/repos/OCN/`.** `[NEW]` = create. `[EDIT]` = modify existing.

### 4.1 Repo-root toolchain

```text
[NEW] package.json                    # name, version, bin, scripts, deps
[NEW] tsconfig.json                   # strict ES2022 NodeNext bundler
[NEW] tsconfig.build.json             # emits to dist/ for production CLI
[NEW] vitest.config.ts                # v8 coverage, fixtures path, globalSetup
[NEW] eslint.config.js                # flat config, typescript-eslint strict
[NEW] .prettierrc.json                # 100-col, single quotes, trailing comma
[NEW] .editorconfig
[NEW] .nvmrc                          # 22 (or 24 LTS)
[NEW] .npmrc                          # save-exact=false, package-lock=true
[NEW] .gitattributes                  # * text=auto eol=lf
[NEW] README.md                       # tiny: install + 5-command demo
[NEW] .github/workflows/ci.yml        # lint + typecheck + test + coverage
[NEW] .husky/pre-commit               # lint + typecheck + test:run
[EDIT] .gitignore                     # already created — no edits needed
[EDIT] CLAUDE.md                      # untouched (already locks rules)
```

#### 4.1.1 `package.json` (key shape)

```jsonc
{
  "name": "ocn",
  "version": "0.0.1-alpha.0",
  "description": "O'CodingNavigator — local-first AI Coding workflow operating system",
  "type": "module",
  "bin": { "ocn": "dist/cli/index.js" },
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "files": ["dist", "LICENSE", "README.md"],
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx src/cli/index.ts",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky || true"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "js-yaml": "^4.1.0",
    "ulid": "^2.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^22.7.0",
    "@typescript-eslint/eslint-plugin": "^8.7.0",
    "@typescript-eslint/parser": "^8.7.0",
    "@vitest/coverage-v8": "^2.1.0",
    "eslint": "^9.11.0",
    "husky": "^9.1.0",
    "prettier": "^3.3.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "license": "Apache-2.0"
}
```

#### 4.1.2 `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "rootDir": ".",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "tests/**/*", "vitest.config.ts"],
  "exclude": ["dist", "node_modules"]
}
```

#### 4.1.3 `tsconfig.build.json`

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "tests"]
}
```

#### 4.1.4 `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/types/**"],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 }
    },
    pool: "forks",
    clearMocks: true,
    testTimeout: 15_000
  }
});
```

#### 4.1.5 `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage/ }
```

#### 4.1.6 `.husky/pre-commit`

```bash
#!/usr/bin/env sh
npm run lint && npm run typecheck && npm run test
```

### 4.2 Source Tree (`src/`)

```text
src/
├── index.ts                                  # public package re-exports (types only for now)
├── cli/
│   ├── index.ts                              # commander entry, registers commands
│   ├── output.ts                             # outputResult(result, opts) → stdout/stderr + exit code
│   ├── render/
│   │   ├── text.ts                           # bilingual text renderer (zh\nen)
│   │   └── json.ts                           # JSON renderer (full CommandResult)
│   └── commands/
│       ├── init.ts
│       ├── status.ts
│       ├── brief.ts
│       ├── doc.ts                            # `doc create <type>` subcommand
│       └── check.ts
├── core/
│   ├── id.ts                                 # stable id helpers + guard validators
│   ├── time.ts                               # nowIsoUtc() etc.
│   ├── i18n.ts                               # msg(en, zh) + BilingualMessage helpers
│   ├── result.ts                             # ok() / blocked() builders + exitCodeFor()
│   ├── paths.ts                              # Paths.{stateFile,sopFile,gatesFile,configFile,prdFile}
│   ├── deps.ts                               # Deps interface + makeDefaultDeps()
│   ├── state/
│   │   └── state-store.ts                    # readState() / writeState() (Phase 1 simple I/O)
│   ├── sop/
│   │   └── loader.ts                         # loadSopProfile() — minimal; returns SopProfile
│   ├── artifact/
│   │   ├── markdown-parser.ts                # parseHeadings(md) → { level, text, line }[]
│   │   ├── required-section-matcher.ts       # matchSection(headings, def) → boolean
│   │   ├── gate-status.ts                    # computeArtifactGateStatus(...)
│   │   └── template-writer.ts                # writeArtifactFromTemplate(...)
│   ├── templates/
│   │   └── prd.ts                            # PRD bilingual template string
│   ├── init.ts                               # initProject(deps, opts) → CommandResult
│   ├── status.ts                             # getStatus(deps, opts) → CommandResult
│   ├── brief.ts                              # generateBrief(deps, opts) → CommandResult
│   ├── doc.ts                                # createArtifact(deps, opts) → CommandResult
│   └── check.ts                              # checkCurrentArtifact(deps, opts) → CommandResult
├── sops/
│   └── default-ai-coding-sop/
│       └── 0.1.0/
│           ├── sop.ts                        # exports `sopYaml` string
│           ├── gates.ts                      # exports `gatesYaml` string
│           ├── artifacts.ts                  # exports `artifactsYaml` string
│           └── config.ts                     # exports `defaultConfigYaml` string
└── types/
    ├── index.ts                              # barrel
    ├── i18n.ts                               # BilingualMessage zod
    ├── result.ts                             # ErrorCode + CommandResult zod
    ├── state.ts                              # ProjectState zod (Skeleton Spike subset)
    ├── sop.ts                                # SopProfile zod (Skeleton Spike subset)
    └── artifact.ts                           # Heading, RequiredSectionDef, ArtifactGateStatus
```

### 4.3 Test Tree (`tests/`)

```text
tests/
├── helpers/
│   ├── temp-project.ts                       # createTempProject() / cleanupTempProject()
│   ├── spawn-ocn.ts                          # spawnOcn(args, opts) launches the CLI subprocess
│   ├── fs-failure.ts                         # injectFsFailure({ENOSPC|EACCES|EBUSY})
│   └── fixtures.ts                           # fixturePath(name) helper
├── fixtures/
│   ├── sop/
│   │   └── skeleton-spike-sop.yaml           # minimal SOP for unit tests
│   ├── artifacts/
│   │   ├── prd-missing-scenarios.md          # missing ONLY section_scenarios
│   │   └── prd-with-scenarios.md             # full required sections present
│   ├── projects/
│   │   ├── empty/.gitkeep                    # bare directory
│   │   └── valid-minimal/                    # mirror of `ocn init --tier minimal` output
│   │       ├── .ocoding/
│   │       │   ├── state.json
│   │       │   ├── sop.yaml
│   │       │   ├── gates.yaml
│   │       │   └── config.yaml
│   │       └── docs/.gitkeep
│   └── state/
│       ├── valid-state.json                  # parses against ProjectState schema
│       └── invalid-state.json                # missing required field
├── unit/
│   ├── hello.test.ts                                       # @ac N/A — sanity
│   ├── schema-bilingual-message.test.ts                    # @ac AC-DOMAIN-001 (BilingualMessage)
│   ├── schema-project-state.test.ts                        # @ac AC-STATE-003
│   ├── id.test.ts                                          # @ac AC-STATE-003
│   ├── time.test.ts                                        # ISO 8601 UTC ending Z
│   ├── result.test.ts                                      # exitCodeFor mapping
│   ├── markdown-parser.test.ts                             # @ac AC-SECTION-001 (heading extraction)
│   ├── required-section-matcher.test.ts                    # @ac AC-SECTION-002, AC-SECTION-003, AC-SECTION-004, AC-SECTION-005
│   ├── gate-status.test.ts                                 # @ac AC-SAG-001, AC-SAG-004
│   ├── temp-project-helper.test.ts
│   ├── spawn-ocn-helper.test.ts
│   └── fs-failure-helper.test.ts
├── cli/
│   ├── help.test.ts                                        # ocn --help works
│   ├── init.test.ts                                        # @ac AC-INIT-001, AC-INIT-002
│   ├── status.test.ts                                      # @ac AC-STATUS-001
│   ├── brief.test.ts                                       # @ac AC-BRIEF-001, AC-BRIEF-002
│   ├── doc-create.test.ts                                  # @ac AC-DOC-001, AC-DOC-003
│   └── check.test.ts                                       # @ac AC-SAG-001, AC-PROMPT-002
└── e2e/
    └── skeleton-spike-demo.test.ts                         # full demo path end-to-end
```

### 4.4 Module-by-module spec

#### 4.4.1 `src/types/i18n.ts`

```ts
import { z } from "zod";
export const BilingualMessage = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
}).strict();
export type BilingualMessage = z.infer<typeof BilingualMessage>;
```

#### 4.4.2 `src/types/result.ts`

```ts
import { z } from "zod";
import { BilingualMessage } from "./i18n.js";

export const ErrorCode = z.enum([
  "OK",
  "ERR_GATE_FAILED",
  "ERR_ARTIFACT_INVALID",
  "ERR_STATE_MACHINE",
  "ERR_IO_OR_CONFIG",
  "ERR_SOP_VERSION",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export type CommandResult<T = unknown> = {
  ok: boolean;
  code: ErrorCode;
  message: BilingualMessage;
  data?: T;
  error?: { code: ErrorCode; message: BilingualMessage; details?: unknown };
};
```

#### 4.4.3 `src/types/state.ts` (Skeleton Spike subset)

```ts
import { z } from "zod";
export const Tier = z.enum(["minimal", "production", "full"]);
export type Tier = z.infer<typeof Tier>;

export const StateId = z.enum([
  "state_discovery", "state_spec", "state_design", "state_plan",
  "state_build", "state_verify", "state_ship", "state_reflect",
]);
export type StateId = z.infer<typeof StateId>;

export const ProjectState = z.object({
  schemaVersion: z.literal("1.0"),
  project: z.object({
    projectId: z.string().min(1),
    name: z.string().min(1),
    tier: Tier,
    sopProfileId: z.string().min(1),
    sopProfileVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  }).strict(),
  currentStateId: StateId,
  currentStepId: z.string().regex(/^step_/),
  artifacts: z.record(z.string(), z.unknown()).default({}),
  latestGateResult: z.null().or(z.unknown()).default(null),
}).strict();
export type ProjectState = z.infer<typeof ProjectState>;
```

#### 4.4.4 `src/core/id.ts`

```ts
import { StateId } from "../types/state.js";
export const STEP_PREFIX = "step_";
export const SECTION_PREFIX = "section_";
export const isStateId = (s: string): s is StateId => StateId.safeParse(s).success;
export const isStepId = (s: string): boolean => s.startsWith(STEP_PREFIX);
export const isSectionId = (s: string): boolean => s.startsWith(SECTION_PREFIX);
```

#### 4.4.5 `src/core/time.ts`

```ts
export const nowIsoUtc = (): string => new Date().toISOString();
// Always ends with "Z" — Z-suffix is contract per CLAUDE.md §4.3
```

#### 4.4.6 `src/core/i18n.ts`

```ts
import type { BilingualMessage } from "../types/i18n.js";
export const msg = (en: string, zh: string): BilingualMessage => ({ en, zh });
```

#### 4.4.7 `src/core/result.ts`

```ts
import type { CommandResult, ErrorCode } from "../types/result.js";
import type { BilingualMessage } from "../types/i18n.js";
export const ok = <T>(message: BilingualMessage, data?: T): CommandResult<T> =>
  ({ ok: true, code: "OK", message, ...(data !== undefined ? { data } : {}) });
export const blocked = (
  code: Exclude<ErrorCode, "OK">,
  message: BilingualMessage,
  data?: unknown,
  details?: unknown,
): CommandResult => ({
  ok: false, code, message,
  ...(data !== undefined ? { data } : {}),
  error: { code, message, ...(details !== undefined ? { details } : {}) },
});
const EXIT_BY_CODE = { OK: 0, ERR_GATE_FAILED: 1, ERR_ARTIFACT_INVALID: 2, ERR_STATE_MACHINE: 3, ERR_IO_OR_CONFIG: 4, ERR_SOP_VERSION: 5 } as const;
export const exitCodeFor = (code: ErrorCode): 0 | 1 | 2 | 3 | 4 | 5 => EXIT_BY_CODE[code];
```

#### 4.4.8 `src/core/paths.ts`

```ts
import { join } from "node:path";
export const Paths = {
  ocodingDir: (root: string) => join(root, ".ocoding"),
  stateFile: (root: string) => join(root, ".ocoding", "state.json"),
  sopFile:   (root: string) => join(root, ".ocoding", "sop.yaml"),
  gatesFile: (root: string) => join(root, ".ocoding", "gates.yaml"),
  configFile:(root: string) => join(root, ".ocoding", "config.yaml"),
  docsDir:   (root: string) => join(root, "docs"),
  prdFile:   (root: string) => join(root, "docs", "02-prd.md"),
} as const;
```

#### 4.4.9 `src/core/state/state-store.ts` (Skeleton Spike — no lock)

```ts
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { Paths } from "../paths.js";
import { ProjectState } from "../../types/state.js";

export async function readState(root: string): Promise<ProjectState> {
  const raw = await fs.readFile(Paths.stateFile(root), "utf8");
  return ProjectState.parse(JSON.parse(raw));
}
export async function writeState(root: string, state: ProjectState): Promise<void> {
  const file = Paths.stateFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  // SKELETON SPIKE: no lock + no backup + no temp/rename. See implementation-notes.md L1.
  await fs.writeFile(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}
```

#### 4.4.10 `src/core/artifact/markdown-parser.ts`

Hand-rolled regex parser (no `marked`/`remark` dep — see §3.2 simplification). Handles ATX headings only.

```ts
const HEADING = /^(#{1,6})\s+(.+?)\s*$/;
export interface Heading { readonly level: number; readonly text: string; readonly line: number; }
export function parseHeadings(md: string): readonly Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trimStart().startsWith("```")) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = HEADING.exec(line);
    if (m && m[1] && m[2]) out.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
  }
  return out;
}
```

#### 4.4.11 `src/core/artifact/required-section-matcher.ts`

```ts
import type { Heading } from "./markdown-parser.js";
export interface RequiredSectionDef {
  readonly id: string;                              // e.g., "section_scenarios"
  readonly canonical: string;                       // "Scenarios"
  readonly aliases: readonly string[];              // ["Scenarios｜使用场景", "使用场景", "Use Cases", "User Scenarios", "用户场景"]
  readonly allowedLevels: readonly number[];        // [2, 3]
}
const norm = (s: string): string => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function matchSection(headings: readonly Heading[], def: RequiredSectionDef): boolean {
  const targets = new Set([def.canonical, ...def.aliases].map(norm));
  return headings.some(h => def.allowedLevels.includes(h.level) && targets.has(norm(h.text)));
}
```

> The `｜` full-width vertical bar is preserved — both fixtures and PRD template use it.

#### 4.4.12 `src/core/artifact/gate-status.ts`

```ts
import type { Heading } from "./markdown-parser.js";
import type { RequiredSectionDef } from "./required-section-matcher.js";
import { matchSection } from "./required-section-matcher.js";

export type ArtifactStatus = "pass" | "warning" | "blocked";
export interface ArtifactGateStatus {
  readonly artifactPath: string;
  readonly status: ArtifactStatus;
  readonly missingRequiredSectionIds: readonly string[];
}
export function computeArtifactGateStatus(args: {
  artifactPath: string;
  headings: readonly Heading[];
  required: readonly RequiredSectionDef[];
}): ArtifactGateStatus {
  const missing = args.required.filter(r => !matchSection(args.headings, r)).map(r => r.id);
  return {
    artifactPath: args.artifactPath,
    status: missing.length > 0 ? "blocked" : "pass",
    missingRequiredSectionIds: missing,
  };
}
```

> **Note on warning-tier**: Skeleton Spike does not yet implement warning (only pass/blocked). `ArtifactStatus` includes `"warning"` for forward compatibility, but `computeArtifactGateStatus` never returns it in spike. Documented in `implementation-notes.md`.

#### 4.4.13 `src/core/templates/prd.ts`

PRD template string with the bilingual headings + Self-check Block per user §VI. Stored as exported constant.

```text (illustrative excerpt)
# Product Requirements Document｜产品需求文档

## Problem｜问题
## Goals｜目标
## Non-goals｜非目标
## Users｜用户
## Scenarios｜使用场景
## Requirements｜需求
## Risks｜风险
## Business Rules｜业务规则
## Permission Rules｜权限规则
## Exception Scenarios｜异常场景
## Non-functional Requirements｜非功能需求
## Step Artifact Gate Self-check｜步骤产物门禁自检
- [ ] Problem｜问题
- [ ] Goals｜目标
- [ ] Non-goals｜非目标
- [ ] Users｜用户
- [ ] Scenarios｜使用场景
- [ ] Requirements｜需求
```

(The actual TS module wraps this string in a backtick template literal and exports it as `prdTemplate`.)

#### 4.4.14 `src/core/artifact/template-writer.ts`

```ts
import { promises as fs } from "node:fs";
import { dirname } from "node:path";
export async function writeArtifact(filePath: string, content: string, overwrite = false): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  if (!overwrite) {
    try { await fs.stat(filePath); throw new Error("EEXIST"); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  await fs.writeFile(filePath, content, "utf8");
}
```

#### 4.4.15 `src/core/sop/loader.ts`

For Skeleton Spike, the loader simply returns the bundled default profile. No on-disk yaml parsing required for the in-process call, but `ocn init` writes the yaml strings to `.ocoding/sop.yaml` etc. so the on-disk view is correct.

```ts
import { sopYaml } from "../../sops/default-ai-coding-sop/0.1.0/sop.js";
import { gatesYaml } from "../../sops/default-ai-coding-sop/0.1.0/gates.js";
import { artifactsYaml } from "../../sops/default-ai-coding-sop/0.1.0/artifacts.js";
import { defaultConfigYaml } from "../../sops/default-ai-coding-sop/0.1.0/config.js";
import type { RequiredSectionDef } from "../artifact/required-section-matcher.js";

export interface SopProfile {
  readonly id: string;
  readonly version: string;
  readonly sopYaml: string;
  readonly gatesYaml: string;
  readonly artifactsYaml: string;
  readonly defaultConfigYaml: string;
  readonly requiredSectionsForStep: (stepId: string) => readonly RequiredSectionDef[];
}

const PRD_REQUIRED: readonly RequiredSectionDef[] = [
  { id: "section_problem",      canonical: "Problem",      aliases: ["Problem｜问题", "问题"],                                                       allowedLevels: [2, 3] },
  { id: "section_goals",        canonical: "Goals",        aliases: ["Goals｜目标", "目标"],                                                          allowedLevels: [2, 3] },
  { id: "section_users",        canonical: "Users",        aliases: ["Users｜用户", "用户"],                                                          allowedLevels: [2, 3] },
  { id: "section_scenarios",    canonical: "Scenarios",    aliases: ["Scenarios｜使用场景", "使用场景", "Use Cases", "User Scenarios", "用户场景"],   allowedLevels: [2, 3] },
  { id: "section_requirements", canonical: "Requirements", aliases: ["Requirements｜需求", "需求"],                                                  allowedLevels: [2, 3] },
];

export function loadSopProfile(): SopProfile {
  return {
    id: "default-ai-coding-sop",
    version: "0.1.0",
    sopYaml, gatesYaml, artifactsYaml, defaultConfigYaml,
    requiredSectionsForStep: (stepId) => stepId === "step_prd" ? PRD_REQUIRED : [],
  };
}
```

#### 4.4.16 `src/sops/default-ai-coding-sop/0.1.0/sop.ts` (and siblings)

Each file just exports a constant `*Yaml` string with the minimal content needed for Skeleton Spike. The `state_spec` block intentionally points at `step_prd`; `state_discovery` is omitted from the spike profile since init jumps straight to `state_spec`.

```yaml
# sop.yaml
profile: default-ai-coding-sop
version: 0.1.0
states:
  - id: state_spec
    name: SPEC
    purpose: Form structured PRD and acceptance criteria
    steps: [step_prd]
```

```yaml
# gates.yaml
gates:
  step_prd:
    requiredSections:
      - section_problem
      - section_goals
      - section_users
      - section_scenarios
      - section_requirements
```

```yaml
# artifacts.yaml
artifacts:
  artifact_prd:
    path: docs/02-prd.md
    requiredForSteps: [step_prd]
```

```yaml
# config.yaml
project:
  tier: minimal
  language: zh
sopProfile:
  id: default-ai-coding-sop
  version: 0.1.0
```

#### 4.4.17 `src/core/init.ts` — `initProject(deps, opts)`

Logic:
1. Validate `opts.cwd` exists.
2. If `.ocoding/` already exists ⇒ blocked `ERR_IO_OR_CONFIG` (per AC-INIT-005 idempotency stub — Skeleton Spike returns blocked, full re-init policy is Phase 2).
3. Create `.ocoding/` and `docs/`.
4. Write `state.json` with the exact shape from user §V (state_spec / step_prd, tier=minimal, schemaVersion 1.0, sopProfileId/Version filled).
5. Write `sop.yaml`, `gates.yaml`, `config.yaml` with bundled strings (`gates.yaml` reflects the same step→sections map as the SOP profile in code).
6. Return `ok(...)` with `data = { stateFile, sopFile, gatesFile, configFile }`.

#### 4.4.18 `src/core/status.ts` — `getStatus(deps, opts)`

1. Read `state.json` (if missing → blocked `ERR_IO_OR_CONFIG`).
2. Validate against `ProjectState`.
3. Return `ok(...)` with structured data matching user §XI: `{ project, currentStateId, currentStepId, currentArtifactPath, nextAction }`.
4. Render layer composes the human text:

```
Project: <name> (<projectId>)
Tier: <tier>
SOP Profile: <id>@<version>
Current State: <currentStateId>
Current Step: <currentStepId>
Current Artifact: docs/02-prd.md (status pending — run `ocn check` to verify)
Next Action: Edit docs/02-prd.md, then `ocn check`
```

#### 4.4.19 `src/core/brief.ts` — `generateBrief(deps, opts)`

1. Read state.
2. Read PRD if it exists, run gate computation to know current artifact status.
3. Build a structured brief with at minimum:

```
Current State        : state_spec
Current Step         : step_prd
Current Artifact     : docs/02-prd.md  (pending|blocked|pass)
Current Objective    : Produce a PRD that passes the Step Artifact Gate.
Current Blockers     : <missingRequiredSectionIds joined or "none">
Next Actions         : 1) Edit docs/02-prd.md  2) ocn check  3) ocn brief
AI Governance Reminder: AI must NOT mark a blocked artifact as complete. AI must NOT advance project state. (CLAUDE.md §4.8 + §10)
Uncertainty Policy    : If data is insufficient, AI must explicitly state "数据不足" or "需要人工确认" instead of guessing.
```

The brief data is fully structured — text rendering reads from `data`. Both the AI Governance Reminder and Uncertainty Policy are required by user §XII and AC-BRIEF-002.

#### 4.4.20 `src/core/doc.ts` — `createArtifact(deps, opts)`

Args: `{ type: "prd", overwrite?: boolean }`.
1. If `type !== "prd"` ⇒ blocked `ERR_ARTIFACT_INVALID` with bilingual "Skeleton Spike supports only `prd`".
2. Compose `Paths.prdFile(opts.cwd)`.
3. Write `prdTemplate` via `writeArtifact(...)`. If file exists and `overwrite=false` ⇒ blocked.
4. Return `ok(...)` with `data = { artifactPath, type: "prd" }`.

#### 4.4.21 `src/core/check.ts` — `checkCurrentArtifact(deps, opts)`

1. Read state, validate. Determine current step ⇒ required sections via `sop.requiredSectionsForStep(stepId)`.
2. Determine artifact path (Skeleton Spike maps `step_prd` → `docs/02-prd.md`).
3. Read file. If missing ⇒ blocked `ERR_ARTIFACT_INVALID` with `data = { artifactPath, status: "blocked", missingRequiredSectionIds: [<all 5>] }`.
4. `parseHeadings(content)` ⇒ headings.
5. `computeArtifactGateStatus({ artifactPath, headings, required })`.
6. If `status === "blocked"`:
   - Special case for the spike acceptance: when the only missing section is `section_scenarios`, message must read exactly:
     - `en`: `"PRD is missing required section: Scenarios."`
     - `zh`: `"PRD 缺少必填章节：Scenarios｜使用场景。"`
   - General case: bilingual "PRD is missing required sections: …" listing all missing ids.
7. If `status === "pass"` ⇒ `ok(...)` with bilingual message exactly:
   - `en`: `"PRD passed Skeleton Spike artifact check."`
   - `zh`: `"PRD 已通过 Skeleton Spike 产物检查。"`

#### 4.4.22 `src/cli/output.ts`

Routes the `CommandResult` to stdout (success/JSON) or stderr (failure text), then `process.exit(exitCodeFor(result.code))`.

```ts
import type { CommandResult } from "../types/result.js";
import { exitCodeFor } from "../core/result.js";
import { renderText } from "./render/text.js";
import { renderJson } from "./render/json.js";
export interface OutputOptions { readonly json: boolean; readonly locale?: "zh" | "en"; }
export function outputResult<T>(result: CommandResult<T>, opts: OutputOptions): never {
  if (opts.json) {
    process.stdout.write(renderJson(result) + "\n");
  } else {
    const text = renderText(result, opts.locale ?? "zh");
    if (result.ok) process.stdout.write(text + "\n");
    else process.stderr.write(text + "\n");
  }
  process.exit(exitCodeFor(result.code));
}
```

#### 4.4.23 `src/cli/index.ts` (commander entry)

Wires:
```
ocn init [--tier <minimal|production|full>]
ocn status [--json]
ocn brief [--json]
ocn doc create <type> [--overwrite]
ocn check [--json]
```

Each handler: parses opts, calls core, calls `outputResult`.

### 4.5 Fixture content

#### 4.5.1 `tests/fixtures/artifacts/prd-missing-scenarios.md`

```md
# Product Requirements Document｜产品需求文档

## Problem｜问题
The product solves X.

## Goals｜目标
Deliver a working spike.

## Non-goals｜非目标
Full implementation.

## Users｜用户
Solo builders.

## Requirements｜需求
- Must detect missing Scenarios.

## Risks｜风险
Skeleton Spike scope creep.
```

#### 4.5.2 `tests/fixtures/artifacts/prd-with-scenarios.md`

Same as above PLUS:

```md
## Scenarios｜使用场景
- Scenario A — user runs ocn check.
- Scenario B — user fixes PRD.
```

#### 4.5.3 `tests/fixtures/state/valid-state.json`

```json
{
  "schemaVersion": "1.0",
  "project": {
    "projectId": "ocn-self",
    "name": "OCN Self Project",
    "tier": "minimal",
    "sopProfileId": "default-ai-coding-sop",
    "sopProfileVersion": "0.1.0"
  },
  "currentStateId": "state_spec",
  "currentStepId": "step_prd",
  "artifacts": {},
  "latestGateResult": null
}
```

#### 4.5.4 `tests/fixtures/state/invalid-state.json`

```json
{ "schemaVersion": "0.0", "project": {}, "currentStateId": "nope" }
```

### 4.6 Test helpers

#### 4.6.1 `tests/helpers/temp-project.ts`

Creates a unique tmp dir under `os.tmpdir()` with prefix `ocn-test-`; cleanup recursively removes it.

#### 4.6.2 `tests/helpers/spawn-ocn.ts`

Launches the CLI as a subprocess via Node's `child_process.spawn` (no shell, no shell-string concatenation — args passed as array). For dev-mode it invokes `npx tsx src/cli/index.ts <args>`; for built-mode it invokes `node dist/cli/index.js <args>` (selectable by env). Returns `{ stdout, stderr, exitCode }`.

> Safety: arguments are always passed as an array, never as a single shell string. No untrusted input flows into the spawn call. `shell: false` is the default and is left as such.

#### 4.6.3 `tests/helpers/fs-failure.ts`

Returns synthetic `NodeJS.ErrnoException` instances tagged with `"ENOSPC" | "EACCES" | "EBUSY"` for unit-tests to simulate filesystem failures via dependency injection.

> Phase 0 verifies the helper API; Phase 2 will integrate with the real state-store via DI.

### 4.7 Phase gating

| Gate | Condition | Action on fail |
|---|---|---|
| **G0 — Phase 0 ready** | `npm run lint && npm run typecheck && npm run test:coverage` all green; coverage report emitted; CLI `--help` works via `tsx`; all fixtures + helpers exist | Stop, fix, re-run |
| **G1 — Phase 1 ready** | All Phase 1 tests green; e2e demo path passes both blocked + pass cases | Stop, fix, re-run |
| **G2 — Acceptance** | Manual run of the verbatim 8-command demo (user §XVIII) yields the exact JSON from §3.3 above | Add Amendment Needed entry, stop |

---

## 5. Acceptance Criteria (traced to docs/03-acceptance-criteria.md)

### 5.1 Functional Requirements

- [ ] **AC-INIT-001 / AC-INIT-002** — `ocn init [--tier minimal]` creates `.ocoding/{state.json,sop.yaml,gates.yaml,config.yaml}` and `docs/`. Default tier when omitted = `minimal`.
- [ ] **AC-STATE-003** — `state.json` uses `currentStateId` + `currentStepId` (string), no numeric `currentStep`.
- [ ] **AC-STATUS-001** — `ocn status` prints Project / Current State / Current Step / Current Artifact / Next Action; `--json` returns `CommandResult`.
- [ ] **AC-BRIEF-001** — `ocn brief` includes currentStateId, currentStepId, current artifact, blockers, next actions.
- [ ] **AC-BRIEF-002** — `ocn brief` includes AI Governance Reminder and Uncertainty Policy.
- [ ] **AC-DOC-001** — `ocn doc create prd` writes `docs/02-prd.md` from the bilingual template containing all required sections.
- [ ] **AC-DOC-003** — Template includes the Step Artifact Gate Self-check block with all 6 unchecked boxes.
- [ ] **AC-SAG-001 / AC-PROMPT-002** — `ocn check` returns `ok=false`, `code=ERR_ARTIFACT_INVALID`, exit code 2 when PRD missing `Scenarios｜使用场景`; `missingRequiredSectionIds` includes `section_scenarios`.
- [ ] **AC-SAG-004** — `ocn check` returns `ok=true`, `code=OK`, exit 0 when PRD has Scenarios; `data.status === "pass"` (warning state stub-only).
- [ ] **AC-SECTION-001 / 002 / 003 / 004 / 005** — Markdown heading parsing & alias matching across canonical + en/zh aliases at heading levels 2 and 3 only.

### 5.2 Non-Functional Requirements

- [ ] `tsc --noEmit` passes with `strict: true`.
- [ ] `eslint` reports zero errors.
- [ ] Vitest coverage ≥ 70% lines / 70% functions / 60% branches (config in §4.1.4) — Phase 1 spike standard.
- [ ] No file > 300 lines (CLAUDE.md §8). No function > 50 lines.
- [ ] Zero `any` in exported APIs (CLAUDE.md §4 + .claude/anti-patterns.md §5).
- [ ] All bilingual messages have non-empty `en` AND `zh`.
- [ ] All ISO timestamps end with `Z`.

### 5.3 Quality Gates

- [ ] Pre-commit hook runs lint + typecheck + test (CLAUDE.md §9).
- [ ] CI workflow passes on push and PR.
- [ ] `dogfood-report-skeleton-spike.md` written with run output transcript.
- [ ] `implementation-notes.md` written with §3.2 simplifications + Amendment Needed list (if any).

---

## 6. System-Wide Impact

### 6.1 Interaction Graph

```
User invokes `ocn check`
  → cli/commands/check.ts parses args
    → core/check.checkCurrentArtifact(deps, opts)
      → core/state/state-store.readState(cwd)        ← reads .ocoding/state.json (no lock)
      → core/sop/loader.loadSopProfile()             ← in-process bundled
      → fs.readFile(docs/02-prd.md, "utf8")          ← reads PRD markdown
      → core/artifact/markdown-parser.parseHeadings  ← regex extract
      → core/artifact/required-section-matcher       ← canonical + alias normalization
      → core/artifact/gate-status.computeArtifactGateStatus
      ← returns CommandResult<ArtifactGateStatus>
    ← cli/output.outputResult(result, { json })
      → renders + process.exit(exitCodeFor(result.code))
```

> **Push events that are NOT yet wired**: `ocn check` does not yet write audit events to `.ocoding/audit/*.jsonl` — Phase 2 wiring per CLAUDE.md §4.7.

### 6.2 Error & Failure Propagation

| Source | Error class | CLI exit |
|---|---|---|
| state.json missing | core throws `OcnIOError("state-missing")` ⇒ caught in CLI ⇒ blocked `ERR_IO_OR_CONFIG` | 4 |
| state.json corrupt (zod parse fail) | core throws ⇒ blocked `ERR_STATE_MACHINE` (Skeleton Spike maps zod parse fail on state to state-machine error) | 3 |
| PRD missing | blocked `ERR_ARTIFACT_INVALID` with all 5 sections in missing list | 2 |
| PRD missing only Scenarios | blocked `ERR_ARTIFACT_INVALID` with `["section_scenarios"]` | 2 |
| PRD pass | `OK` | 0 |
| Doc type ≠ "prd" | blocked `ERR_ARTIFACT_INVALID` "Skeleton Spike supports only prd" | 2 |
| Init when `.ocoding/` exists | blocked `ERR_IO_OR_CONFIG` | 4 |

### 6.3 State Lifecycle Risks

- **State write atomicity**: NOT guaranteed in Skeleton Spike. If `ocn init` is killed mid-write, `.ocoding/state.json` may be empty/partial. Documented in implementation-notes.md as Amendment-flag (operational risk acceptable for spike).
- **Concurrent CLI invocations**: undefined behavior in spike (no `.ocoding/.lock`). Acceptable since spike is human-driven, single-process.

### 6.4 API Surface Parity

- CLI is the **only** surface in Skeleton Spike. MCP server is **not** wired (CLAUDE.md §4.8 + .claude/anti-patterns.md §11).
- Forbidden CLI flags: `--skip-required-sections`, `--force-pass`, `--override` without `--override-reason` (.claude/anti-patterns.md §12).

### 6.5 Integration Test Scenarios (e2e)

1. **Empty dir → init → status → brief → doc create prd → check (template-default content)** — must pass (template has all required headings).
2. **After init: copy `prd-missing-scenarios.md` over `docs/02-prd.md` → check --json** — `ok=false`, exit 2, `missingRequiredSectionIds=["section_scenarios"]`, message bilingual exact match.
3. **After init: copy `prd-with-scenarios.md` over `docs/02-prd.md` → check --json** — `ok=true`, exit 0, message bilingual exact match.
4. **Check before init** — blocked `ERR_IO_OR_CONFIG`, exit 4.
5. **Init twice in same dir** — second blocked `ERR_IO_OR_CONFIG`, exit 4.

---

## 7. Implementation Phases

### Phase 0 — Test Infrastructure (gate G0)

**Order matters. Each step builds on the previous.**

1. Initialize repo toolchain
   - `package.json` (§4.1.1)
   - `tsconfig.json` + `tsconfig.build.json` (§4.1.2-3)
   - `vitest.config.ts` (§4.1.4)
   - `eslint.config.js`, `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.npmrc`, `.gitattributes`
2. Install deps: `npm install`
3. Initialize Husky + write `.husky/pre-commit` (§4.1.6)
4. Write `.github/workflows/ci.yml` (§4.1.5)
5. Write zod schemas: `src/types/{i18n,result,state,sop,artifact}.ts` and barrel `src/types/index.ts`
6. Write empty stubs (just enough for `tsc --noEmit` to pass):
   - `src/cli/index.ts` (commander shell with `--help` only)
   - `src/cli/commands/{init,status,brief,doc,check}.ts` (action functions return blocked NOT_IMPLEMENTED)
   - `src/cli/output.ts`, `src/cli/render/{text,json}.ts`
   - `src/core/{id,time,i18n,result,paths,deps}.ts`
   - `src/core/state/state-store.ts`, `src/core/sop/loader.ts`
   - `src/core/artifact/{markdown-parser,required-section-matcher,gate-status,template-writer}.ts`
   - `src/core/templates/prd.ts`
   - `src/core/{init,status,brief,doc,check}.ts` (return blocked NOT_IMPLEMENTED)
   - `src/sops/default-ai-coding-sop/0.1.0/{sop,gates,artifacts,config}.ts`
7. Write fixtures (§4.5)
8. Write test helpers (§4.6)
9. Write Phase 0 unit tests:
   - `tests/unit/hello.test.ts`
   - `tests/unit/schema-bilingual-message.test.ts`
   - `tests/unit/schema-project-state.test.ts`
   - `tests/unit/temp-project-helper.test.ts`
   - `tests/unit/spawn-ocn-helper.test.ts` (asserts `ocn --help` exit 0 + non-empty stdout)
   - `tests/unit/fs-failure-helper.test.ts`
10. Run `npm run lint && npm run typecheck && npm run test:coverage` ⇒ **G0 must be green**.

### Phase 1 — Skeleton Spike (gate G1)

1. Implement primitives: `id.ts`, `time.ts`, `i18n.ts`, `result.ts`, `paths.ts` + their unit tests.
2. Implement `markdown-parser.ts` + `required-section-matcher.ts` + `gate-status.ts` + their unit tests (§4.4.10-12).
3. Implement `templates/prd.ts` + `template-writer.ts`.
4. Implement `sops/default-ai-coding-sop/0.1.0/*.ts` (string constants).
5. Implement `sop/loader.ts`.
6. Implement `state-store.ts` (no lock).
7. Implement core functions in this order: `init.ts` → `status.ts` → `doc.ts` → `check.ts` → `brief.ts`.
8. Wire CLI commands one-by-one with their tests:
   - `init` → CLI test
   - `status` → CLI test
   - `doc create prd` → CLI test
   - `check` → CLI test (both blocked and pass)
   - `brief` → CLI test (governance + uncertainty)
9. Write `tests/e2e/skeleton-spike-demo.test.ts` (full demo path).
10. Run full suite ⇒ **G1 must be green**.

### Phase 1.5 — Manual demo verification (gate G2)

1. `npm run build`
2. `npm link` (or `npm pack` + extract)
3. In a fresh tmp dir, run the verbatim 8-command demo from user §XVIII.
4. Capture transcript into `dogfood-report-skeleton-spike.md`.

### Phase 1.6 — Reports

1. `dogfood-report-skeleton-spike.md` — transcript + console output snapshots + acceptance verdict.
2. `implementation-notes.md` — every entry from §3.2 + any Amendment Needed flags discovered.

---

## 8. Alternative Approaches Considered

| Approach | Rejected because |
|---|---|
| Use `marked` or `remark` for markdown parsing | Adds dep; only need heading extraction in spike. Hand-rolled regex is ~30 lines and traceable. (Switch in Phase 2 once section-body parsing required.) |
| Bundle SOP yaml as filesystem assets via `--copy-files` build step | Adds build complexity; spike doesn't need user-editable profile. TypeScript string-constant export is simpler. |
| In-process CLI tests (import handlers directly) | Bypasses commander wiring + exit code; cannot validate the actual surface. Use subprocess via `tsx`. |
| Implement full lock + backup + temp-rename in spike | Out of scope per user §III. Adds 1+ day with no value to spike's binary acceptance. Documented for Phase 2. |
| Use `bun` or `deno` runtime | Out of scope per CLAUDE.md §3 (`Node.js`). |
| Use `pnpm` workspace from day one | Single package; npm sufficient. Deferred. |

---

## 9. Dependencies & Risks

### 9.1 Hard dependencies

- Node.js ≥ 22 (engines field) — required for native ESM + modern fs/promises ergonomics.
- `npm install` works in development environment.
- `tsx` works for in-process subprocess invocation (validated by Phase 0 spawn-ocn helper test).

### 9.2 Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Hand-rolled markdown parser misses an edge case in a real fixture | M | M | Tests cover canonical + 4 alias cases per section + level-1/level-4 negative case (AC-SECTION-005). |
| R2 | `Scenarios｜使用场景` full-width vertical bar normalization issue | M | H | Use `String.normalize("NFKC")` in matcher; test fixtures explicitly include the `｜` character. |
| R3 | `tsx`-spawned CLI behaves differently than built CLI | L | M | Add one e2e test that builds (`npm run build`) and runs `node dist/cli/index.js` in addition to tsx-based tests. |
| R4 | Coverage thresholds fail on small spike | L | L | Thresholds set to 70/70/60/70 (not 90) for spike; bump in Phase 2. |
| R5 | Package name `ocn` already taken on npm | M | L | Spike uses local install only; npm publishing is Phase 2 / GA decision. Document under "namespace TBD" in dogfood report. |
| R6 | Husky 9 install in CI environment without `prepare` failing | L | L | `prepare` script uses `husky || true` to ignore failure; CI doesn't need hooks. |

### 9.3 Amendment-Needed candidates (write to `implementation-notes.md`)

If during implementation any of these surface, flag them — do **not** silently fix design docs:

- IA Amendment if `ocn check` flow needs a fundamentally different gate API than `docs/04-IA.md` describes.
- Data Model Amendment if `state.json` Skeleton Spike subset cannot be evolved into the full schema without breaking change.
- API Contract Amendment if `CommandResult` shape conflicts with what `ocn check` semantically needs (e.g., need to surface `warning` aside from `pass`/`blocked`).
- Test Strategy Amendment if any AC traceability cannot be satisfied with the planned test organization.

---

## 10. Success Metrics

- All G0 / G1 / G2 gates green.
- Demo transcript reproduces the exact JSON from §3.3 verbatim.
- `dogfood-report-skeleton-spike.md` and `implementation-notes.md` exist with non-trivial content.
- Coverage reports generated and ≥ thresholds.

---

## 11. Resource Requirements

- Single contributor (Claude Code execution).
- Estimated effort: 2 implementation passes (~600-800 LOC across src/, ~400-600 LOC across tests/).
- No external services required.

---

## 12. Future Considerations (Phase 2+)

> Captured but **not** implemented in this plan. Each becomes a future PR/branch.

- Full state machine (DISCOVERY → SPEC → DESIGN → PLAN → BUILD → VERIFY → SHIP → REFLECT) with `ocn advance` + `runGate`.
- Lock + backup + atomic write for `state.json` per CLAUDE.md §4.5.
- Audit event subsystem (jsonl-based, push-only set per CLAUDE.md §4.7).
- Baseline + decision log + dev log artifact creators.
- Doctor + Reset (`--keep-docs`, `--keep-state`, `--hard`).
- SOP versioning: `ocn sop version`, `ocn sop diff`, `ocn sop upgrade --plan`.
- Test result gate: `ocn test record --from vitest <path>`, `ocn check --include-tests`.
- Tier production / full artifact set.
- Minimal MCP Server (7 tools, no `advance_phase`).
- Real `marked`/`remark` parser for body content checks.
- AC coverage script that walks `docs/03-acceptance-criteria.md` and asserts every `must` AC has ≥ 1 test reference.

---

## 13. Documentation Plan

After Skeleton Spike pass:

- `dogfood-report-skeleton-spike.md` (root) — transcript, verdict, gate results.
- `implementation-notes.md` (root) — simplifications + Amendment-Needed flags.
- `README.md` updates — add 5-command quickstart.
- (Skeleton Spike does NOT modify `docs/00-08`.)

---

## 14. Sources & References

### Internal

- `/home/timou/repos/OCN/CLAUDE.md` (§3 stack, §4 hard rules, §5 state machine, §6 current position, §7 tree, §8 limits, §9 workflow, §10 governance)
- `/home/timou/repos/OCN/.claude/rules.md` (TypeScript strict + zod-first, state-safety, CLI rules, audit, errors, tests, deps)
- `/home/timou/repos/OCN/.claude/patterns.md` (Result, guard clauses, composition, pure-core/effectful-edges, single composition root)
- `/home/timou/repos/OCN/.claude/anti-patterns.md` (numeric pointers, MD as runtime source, swallowing errors, `any`, mutation, skipping lock, business logic in CLI, scope drift)
- `docs/00-project-brief.md` §10 (stable IDs), Appendix A (SOP Step Map), Decision 001
- `docs/01-scope.md` §5.7 (Tier), §5.8 (Gates), §5.17 (MCP whitelist), §8 (must-not-do)
- `docs/02-prd.md` §1-2 (purpose / background)
- `docs/03-acceptance-criteria.md` (AC IDs cited inline)
- `docs/04-information-architecture.md` §2 (design principles)
- `docs/05-data-model.md` §3 (Local-first, stable ID, ISO 8601 UTC, BilingualMessage, runtime structured priority)
- `docs/06-api-contract.md` §2 (contract principles, presentation-free core, MCP safety)
- `docs/07-test-strategy.md` §2-4 (8 layers, AC traceability, infrastructure-first)
- `docs/08-mvp-plan.md` §3 (Skeleton Spike scope — verbatim)

### External

- Node.js ≥ 22 ESM + NodeNext module resolution
- `commander` v12 docs for command tree pattern
- `zod` v3 for schema-first inference
- `vitest` v2 + `@vitest/coverage-v8`
- `tsx` for subprocess helper

---

## 15. Plan Verification Checklist

Before declaring this plan complete, the implementer must confirm:

- [x] Every CLAUDE.md hard rule appears as a constraint somewhere in this plan.
- [x] Every must-not-do from `docs/01-scope.md` §8 is reflected in §3.2 or §8.
- [x] Every required AC ID has a corresponding test path in §4.3 or §5.1.
- [x] Phase gates G0/G1/G2 have explicit pass criteria.
- [x] No file > 300 lines in target tree.
- [x] `implementation-notes.md` deliverable defined.
- [x] `dogfood-report-skeleton-spike.md` deliverable defined.
- [x] Filename uses correct format `YYYY-MM-DD-<type>-<descriptive-name>-plan.md`.

---

**END OF PLAN**

Next step in the LFG sequence: `/compound-engineering:deepen-plan` will enhance each section with parallel research agents (best-practices, performance, UI N/A for CLI). Then `/workflows:work` will execute Phase 0 → Phase 1 → reports.

---

## 16. Amendments (post `/deepen-plan` round 1, 2026-04-28)

> Targeted deepening, pipeline mode. Original plan unchanged — only the four blocking ambiguities below are pinned down.

### 16.1 ESM + NodeNext + tsc-emitted bin file (Node 22)

**Conventions confirmed and pinned:**

1. With `"type": "module"` in `package.json`, every `.js` file in `dist/` is an ES module.
2. With `"module": "NodeNext"` in `tsconfig.json`, TypeScript **requires** explicit `.js` extensions on relative imports in source — even though the source files are `.ts`. This is correct throughout the plan (e.g., `import { Paths } from "../paths.js"`).
3. `src/cli/index.ts` MUST begin with the shebang line so the published `bin` is invokable:
   ```ts
   #!/usr/bin/env node
   import { Command } from "commander";
   // ...
   ```
   `tsc` preserves the shebang on the first line when emitting ESM.
4. After `tsc` emits `dist/cli/index.js`, the file needs the executable bit. Two acceptable approaches:
   - **Preferred (zero scripts):** Rely on `npm` itself — when a package is installed and the `package.json` lists a file in `bin`, npm sets the executable bit automatically on the symlink target. For local development before publishing, run `chmod +x dist/cli/index.js` once or run via `npm link`.
   - **Alternative (explicit):** Add a postbuild step:
     ```jsonc
     "scripts": {
       "build": "tsc -p tsconfig.build.json && chmod +x dist/cli/index.js"
     }
     ```
   The plan adopts the **alternative** to keep `npm run build` self-contained on developer machines and CI.
5. Top-level `await` is allowed in ESM Node 22 if needed, but the plan does not use it.

### 16.2 Vitest v2 + `@vitest/coverage-v8`

**Confirmed minimum config that satisfies the spec:**

- `provider: "v8"` requires only `@vitest/coverage-v8` as devDep — it does not require running tests through node's V8 inspector or any extra flag.
- Coverage thresholds (lines/functions/branches/statements) cause `vitest run --coverage` to exit non-zero when missed. Pre-commit `npm test` does NOT include coverage by default per §4.1.1 — only `npm run test:coverage` does, and CI runs that. This is intentional: pre-commit stays fast.
- `pool: "forks"` is fine for a small spike (slightly slower cold start than `threads` but more isolated for filesystem-touching tests). Keep as-is.
- `clearMocks: true` resets `vi.fn()` and `vi.spyOn()` between tests — desired.
- `testTimeout: 15_000` is generous for spawn-based CLI tests (Node + tsx cold-start can be ~2-3s on first call).
- The CI workflow (§4.1.5) runs `test:coverage`, which surfaces coverage failures as build failures. No additional config needed.

No change to the existing config in §4.1.4.

### 16.3 Husky v9 init flow under npm-only

**Confirmed:**

1. `npm install` triggers the `prepare` script. With `"prepare": "husky || true"`, husky's CLI runs and creates `.husky/_/` shim files. The `|| true` swallows failures in CI where `.git` may not exist.
2. Husky v9 hooks are **plain shell scripts** — they do NOT need to source `husky.sh` (that was v8). So `.husky/pre-commit` (§4.1.6) is correct as-is:
   ```sh
   #!/usr/bin/env sh
   npm run lint && npm run typecheck && npm run test
   ```
3. The hook file does not need to be marked executable in git — husky's CLI sets the executable bit during init. Developers cloning the repo run `npm install` first, which runs `prepare`, which sets up the hooks.
4. CI does NOT need hooks installed. The `|| true` ensures CI install never fails on hook setup.

### 16.4 NFKC vs FULLWIDTH-VERTICAL-LINE (U+FF5C `｜`)

**Critical clarification — locks matcher correctness:**

1. Unicode normalization form NFKC (Compatibility Decomposition + Canonical Composition) **does fold** `U+FF5C FULLWIDTH-VERTICAL-LINE` (`｜`) to `U+007C VERTICAL LINE` (`|`). This is by design — full-width Latin/punctuation has compatibility decomposition to ASCII.
2. Therefore, in `required-section-matcher.ts`'s `norm()`:
   ```ts
   "Scenarios｜使用场景".normalize("NFKC") === "Scenarios|使用场景"   // true
   ```
3. Both sides of the comparison go through the same `norm()` function, so the matcher is **correct as planned**. A heading written with the full-width pipe `｜` and an alias listed with the full-width pipe will both fold to ASCII before set lookup.
4. **Bonus side-effect (intentional):** A user who typed the ASCII pipe `Scenarios|使用场景` in their heading will also match — both forms collapse to the same normalized string. This is desired flexibility.
5. **CJK characters do NOT change under NFKC** in the relevant strings here. `"使用场景".normalize("NFKC") === "使用场景"`. Safe.
6. **Required test (added to §4.3 implicitly via `required-section-matcher.test.ts`):**
   - Test case "matches `Scenarios｜使用场景` heading against alias list containing `Scenarios｜使用场景`" — must pass.
   - Test case "matches `Scenarios|使用场景` heading (ASCII pipe) against alias list containing `Scenarios｜使用场景` (full-width pipe)" — must pass (this proves NFKC fold is operational).
   - Test case "matches `使用场景` standalone heading" — must pass.
   - Negative test: `Scenario` (singular, no pipe) must NOT match.
7. **Human-facing message strings keep the full-width pipe.** The bilingual zh message `"PRD 缺少必填章节：Scenarios｜使用场景。"` is for display only; it never goes through `norm()`. Render layer outputs the original characters.

### 16.5 Minor pin-downs surfaced during deepening

- `commander` v12 expects `import { Command } from "commander"` and `program.parseAsync(process.argv)` for async actions. CLI handlers calling async core MUST use `parseAsync`.
- `process.exit()` in `outputResult()` is the documented way to terminate with a specific code from `commander`-driven actions; it is in `src/cli/output.ts` only (never in core). Per `.claude/anti-patterns.md` §20 this is acceptable since it is at the CLI edge.
- `js-yaml` is used to **write** the bundled YAML strings unchanged via `fs.writeFile`; we do NOT call `js-yaml.dump()` in the spike (we ship pre-formatted strings). It's still listed as a runtime dep for Phase 2 SOP-yaml round-tripping. Keep dep, do not import in spike code unless reading user-supplied yaml — which the spike does not do.

---

**END OF AMENDMENTS — PLAN IS NOW LOCKED FOR `/workflows:work` EXECUTION.**
