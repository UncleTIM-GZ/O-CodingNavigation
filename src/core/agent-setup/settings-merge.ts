// AM-006 / DEC-031 — pure merge of OCN's hook entries into the project's
// shared `.claude/settings.json`. Merge-not-overwrite: we only ever APPEND
// our two hook groups; existing entries (even customized OCN ones) and every
// other key are left untouched. The `command -v ocn` guard makes the hooks a
// silent no-op for teammates who don't have ocn installed (the settings file
// is committed to the repo).

export type SetupFileAction = "created" | "updated" | "skipped";

export type SettingsMergeResult =
  | { readonly ok: true; readonly content: string; readonly action: SetupFileAction }
  | { readonly ok: false; readonly malformed: true };

export const OCN_HOOK_MARKER = "ocn hook";

// AM-009 — every Bash call from the agent carries the actor signature, so
// `ocn advance` / `ocn task check` run by the agent are attributed (and
// authorized) as ai_agent without relying on a per-command flag.
export const OCN_ACTOR_ENV_KEY = "OCN_ACTOR";
export const OCN_ACTOR_ENV_VALUE = "ai_agent";

const STOP_GROUP = {
  hooks: [
    {
      type: "command",
      command: "if command -v ocn >/dev/null 2>&1; then ocn hook stop; fi",
      timeout: 300,
    },
  ],
};

const POST_EDIT_GROUP = {
  matcher: "Edit|Write",
  hooks: [
    {
      type: "command",
      command: "if command -v ocn >/dev/null 2>&1; then ocn hook post-edit; fi",
      timeout: 120,
    },
  ],
};

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** A hook group is "ours" iff any of its command strings mentions `ocn hook`
 *  — user-customized variants count and are left untouched. */
function containsOcnHook(group: unknown): boolean {
  if (!isPlainObject(group) || !Array.isArray(group["hooks"])) return false;
  return group["hooks"].some(
    (h) =>
      isPlainObject(h) &&
      typeof h["command"] === "string" &&
      h["command"].includes(OCN_HOOK_MARKER),
  );
}

function serialize(root: JsonObject): string {
  return JSON.stringify(root, null, 2) + "\n";
}

/** Returns true when appended, false when an OCN entry already exists.
 *  Throws on a malformed event slot (present but not an array). */
function ensureEventGroup(hooks: JsonObject, event: string, group: unknown): boolean {
  if (hooks[event] === undefined) hooks[event] = [];
  const slot = hooks[event];
  if (!Array.isArray(slot)) throw new Error("malformed");
  if (slot.some(containsOcnHook)) return false;
  slot.push(group);
  return true;
}

/** Returns true when the env key was added; existing values (even customized
 *  ones) are left untouched. Throws on a malformed env slot. */
function ensureActorEnv(root: JsonObject): boolean {
  if (root["env"] === undefined) root["env"] = {};
  const env = root["env"];
  if (!isPlainObject(env)) throw new Error("malformed");
  if (env[OCN_ACTOR_ENV_KEY] !== undefined) return false;
  env[OCN_ACTOR_ENV_KEY] = OCN_ACTOR_ENV_VALUE;
  return true;
}

/** Inverse of `mergeClaudeSettings` — used by `ocn stop` teardown. Surgically
 *  removes ONLY the OCN-owned surfaces (hook groups whose command mentions
 *  `ocn hook`, and `env.OCN_ACTOR === ai_agent`); user-customized entries and
 *  every other key are left byte-for-byte intact. Empty `hooks[event]` arrays
 *  and an emptied `hooks` / `env` object are pruned so we do not leave debris.
 *  Fail-safe: malformed JSON is reported (caller skips — never rewrites a file
 *  it cannot parse). */
export function unmergeClaudeSettings(existingText: string | null): SettingsMergeResult {
  if (existingText === null) return { ok: true, content: "", action: "skipped" };

  let root: unknown;
  try {
    root = JSON.parse(existingText);
  } catch {
    return { ok: false, malformed: true };
  }
  if (!isPlainObject(root)) return { ok: false, malformed: true };

  let changed = false;

  const hooks = root["hooks"];
  if (isPlainObject(hooks)) {
    for (const event of ["Stop", "PostToolUse"]) {
      const slot = hooks[event];
      if (!Array.isArray(slot)) continue;
      const kept = slot.filter((g) => !containsOcnHook(g));
      if (kept.length === slot.length) continue;
      changed = true;
      if (kept.length === 0) delete hooks[event];
      else hooks[event] = kept;
    }
    if (Object.keys(hooks).length === 0) delete root["hooks"];
  }

  const env = root["env"];
  if (isPlainObject(env) && env[OCN_ACTOR_ENV_KEY] === OCN_ACTOR_ENV_VALUE) {
    delete env[OCN_ACTOR_ENV_KEY];
    changed = true;
    if (Object.keys(env).length === 0) delete root["env"];
  }

  if (!changed) return { ok: true, content: existingText, action: "skipped" };
  return { ok: true, content: serialize(root), action: "updated" };
}

export function mergeClaudeSettings(existingText: string | null): SettingsMergeResult {
  if (existingText === null) {
    const fresh: JsonObject = {
      env: { [OCN_ACTOR_ENV_KEY]: OCN_ACTOR_ENV_VALUE },
      hooks: { Stop: [STOP_GROUP], PostToolUse: [POST_EDIT_GROUP] },
    };
    return { ok: true, content: serialize(fresh), action: "created" };
  }

  let root: unknown;
  try {
    root = JSON.parse(existingText);
  } catch {
    return { ok: false, malformed: true };
  }
  if (!isPlainObject(root)) return { ok: false, malformed: true };

  if (root["hooks"] === undefined) root["hooks"] = {};
  if (!isPlainObject(root["hooks"])) return { ok: false, malformed: true };
  const hooks = root["hooks"];

  try {
    const stopAdded = ensureEventGroup(hooks, "Stop", STOP_GROUP);
    const postEditAdded = ensureEventGroup(hooks, "PostToolUse", POST_EDIT_GROUP);
    const envAdded = ensureActorEnv(root);
    if (!stopAdded && !postEditAdded && !envAdded) {
      return { ok: true, content: existingText, action: "skipped" };
    }
    return { ok: true, content: serialize(root), action: "updated" };
  } catch {
    return { ok: false, malformed: true };
  }
}
