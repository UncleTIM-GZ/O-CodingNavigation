import { promises as fs } from "node:fs";
import { isAbsolute, join, normalize, sep } from "node:path";
import type { BilingualMessage } from "../../types/i18n.js";
import type { FailureCode } from "../../types/result.js";
import { ProjectState } from "../../types/state.js";
import { msg } from "../i18n.js";

// PR C — projectRoot validation seam for the MCP tool surface. Centralises
// every check so each tool handler can do `await validateProjectRoot(input)`
// and never worry about path traversal, missing directories, or symlink
// confusion. Returns a discriminated result; never throws.
//
// Symlink policy (per docs/security/mcp-threat-model.md §5):
//   1. A symlink IS allowed as the projectRoot.
//   2. The validator resolves it via fs.realpath and returns the canonical
//      path. Subsequent core fns receive the realpath, so any later path
//      computation is anchored to the resolved target — not the symlink.
//   3. Files written under the projectRoot must remain inside the resolved
//      realpath. Use assertPathInsideRoot (sync) or
//      assertResolvedPathInsideRoot (async) to verify when reading paths
//      that may themselves contain symlinks.

export interface ProjectRootValidationOk {
  readonly ok: true;
  readonly projectRoot: string;
}

export interface ProjectRootValidationError {
  readonly ok: false;
  readonly error: {
    readonly code: FailureCode;
    readonly message: BilingualMessage;
  };
}

export type ProjectRootValidationResult = ProjectRootValidationOk | ProjectRootValidationError;

const fail = (code: FailureCode, en: string, zh: string): ProjectRootValidationError => ({
  ok: false,
  error: { code, message: msg(en, zh) },
});

export async function validateProjectRoot(input: unknown): Promise<ProjectRootValidationResult> {
  if (typeof input !== "string") {
    return fail("ERR_IO_OR_CONFIG", "projectRoot must be a string.", "projectRoot 必须是字符串。");
  }
  if (input.length === 0) {
    return fail(
      "ERR_IO_OR_CONFIG",
      "projectRoot must be a non-empty string.",
      "projectRoot 必须是非空字符串。",
    );
  }
  if (input.includes("\0")) {
    return fail(
      "ERR_IO_OR_CONFIG",
      "projectRoot must not contain null bytes.",
      "projectRoot 不能包含空字节。",
    );
  }
  if (!isAbsolute(input)) {
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot must be an absolute path (got: ${input}).`,
      `projectRoot 必须是绝对路径（当前值：${input}）。`,
    );
  }
  // path.normalize collapses `..` segments; the result must remain absolute.
  const normalized = normalize(input);
  if (!isAbsolute(normalized)) {
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot normalisation produced a non-absolute path (input: ${input}).`,
      `projectRoot 标准化后变成相对路径（输入：${input}）。`,
    );
  }

  // Stat the (normalised) path. Must exist + be a directory.
  let stat;
  try {
    stat = await fs.stat(normalized);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return fail(
        "ERR_IO_OR_CONFIG",
        `projectRoot does not exist: ${normalized}.`,
        `projectRoot 不存在：${normalized}。`,
      );
    }
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot stat failed: ${e.message}`,
      `projectRoot 状态读取失败：${e.message}`,
    );
  }
  if (!stat.isDirectory()) {
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot is not a directory: ${normalized}.`,
      `projectRoot 不是目录：${normalized}。`,
    );
  }

  // Resolve realpath. If the input was a symlink, we anchor to the resolved
  // target. The threat model documents this policy explicitly.
  let realPath: string;
  try {
    realPath = await fs.realpath(normalized);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot realpath resolution failed: ${e.message}`,
      `projectRoot realpath 解析失败：${e.message}`,
    );
  }

  // Defence-in-depth: re-stat the realpath. A TOCTOU window exists between
  // the two stats; both must report a directory.
  try {
    const realStat = await fs.stat(realPath);
    if (!realStat.isDirectory()) {
      return fail(
        "ERR_IO_OR_CONFIG",
        `projectRoot resolved target is not a directory: ${realPath}.`,
        `projectRoot 解析后的目标不是目录：${realPath}。`,
      );
    }
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    return fail(
      "ERR_IO_OR_CONFIG",
      `projectRoot realpath stat failed: ${e.message}`,
      `projectRoot realpath 状态读取失败：${e.message}`,
    );
  }

  return { ok: true, projectRoot: realPath };
}

/** Pure path-containment check. Both arguments must be absolute paths.
 *  Returns true iff `target` is identical to `root` or sits beneath it. */
export function assertPathInsideRoot(root: string, target: string): boolean {
  const normalizedRoot = normalize(root);
  const normalizedTarget = normalize(target);
  if (!isAbsolute(normalizedRoot) || !isAbsolute(normalizedTarget)) {
    return false;
  }
  if (normalizedTarget === normalizedRoot) {
    return true;
  }
  const rootWithSep = normalizedRoot.endsWith(sep) ? normalizedRoot : normalizedRoot + sep;
  return normalizedTarget.startsWith(rootWithSep);
}

/** Async containment check that resolves symlinks on both paths first.
 *  Returns false if either path cannot be resolved (e.g. broken symlink,
 *  non-existent target). For paths that don't yet exist, callers should
 *  use the sync `assertPathInsideRoot` against an already-resolved root. */
export async function assertResolvedPathInsideRoot(root: string, target: string): Promise<boolean> {
  let resolvedRoot: string;
  let resolvedTarget: string;
  try {
    resolvedRoot = await fs.realpath(root);
  } catch {
    return false;
  }
  try {
    resolvedTarget = await fs.realpath(target);
  } catch {
    return false;
  }
  return assertPathInsideRoot(resolvedRoot, resolvedTarget);
}

// P1-001 — Initialized-project boundary check for the MCP tool surface.
//
// `validateProjectRoot` only enforces "absolute existing directory". That is
// the right contract for path-traversal containment, but it leaves the
// mutating MCP tools (`navigator.create_artifact` in particular) free to
// write into any directory the host points at — including `/`, `$HOME`, or
// an unrelated repo. P1-001 from the post-alpha Codex audit closes that hole
// by requiring `<projectRoot>/.ocoding/state.json` to exist and validate
// before any MCP tool runs.
//
// All seven v1.0 MCP tools call this validator. Mutating tools refuse to
// write when the directory is not initialized; read-only tools refuse to
// answer (since their answers would be meaningless without state.json + SOP
// metadata). Per CLAUDE.md §4.6 we reuse the existing `ERR_IO_OR_CONFIG`
// failure code rather than expanding the closed `ErrorCode` enum, and we
// surface a structured `reason` for hosts that want to branch.

export type InitializedProjectFailureReason =
  | "invalid-project-root"
  | "state-json-missing"
  | "state-json-malformed"
  | "state-json-schema-invalid";

export interface InitializedProjectValidationOk {
  readonly ok: true;
  readonly projectRoot: string;
}

export interface InitializedProjectValidationError {
  readonly ok: false;
  readonly error: {
    readonly code: FailureCode;
    readonly message: BilingualMessage;
    readonly reason: InitializedProjectFailureReason;
  };
}

export type InitializedProjectValidationResult =
  | InitializedProjectValidationOk
  | InitializedProjectValidationError;

const failInit = (
  reason: InitializedProjectFailureReason,
  en: string,
  zh: string,
): InitializedProjectValidationError => ({
  ok: false,
  error: { code: "ERR_IO_OR_CONFIG", message: msg(en, zh), reason },
});

const NOT_INITIALIZED_EN = "projectRoot is not an initialized OCN project. Run `ocn init` first.";
const NOT_INITIALIZED_ZH = "projectRoot 不是已初始化的 OCN 项目。请先运行 `ocn init`。";

export async function validateInitializedProjectRoot(
  input: unknown,
): Promise<InitializedProjectValidationResult> {
  const base = await validateProjectRoot(input);
  if (!base.ok) {
    return {
      ok: false,
      error: {
        code: base.error.code,
        message: base.error.message,
        reason: "invalid-project-root",
      },
    };
  }

  const stateFile = join(base.projectRoot, ".ocoding", "state.json");

  let raw: string;
  try {
    raw = await fs.readFile(stateFile, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      return failInit("state-json-missing", NOT_INITIALIZED_EN, NOT_INITIALIZED_ZH);
    }
    return failInit(
      "state-json-missing",
      `projectRoot state.json read failed: ${e.message}`,
      `projectRoot state.json 读取失败：${e.message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return failInit(
      "state-json-malformed",
      `projectRoot state.json is malformed JSON: ${(err as Error).message}`,
      `projectRoot state.json JSON 格式损坏：${(err as Error).message}`,
    );
  }

  const validated = ProjectState.safeParse(parsed);
  if (!validated.success) {
    return failInit(
      "state-json-schema-invalid",
      "projectRoot state.json failed schema validation. Run `ocn init` to (re)initialize.",
      "projectRoot state.json 未通过 schema 校验。请运行 `ocn init` 重新初始化。",
    );
  }

  return { ok: true, projectRoot: base.projectRoot };
}
