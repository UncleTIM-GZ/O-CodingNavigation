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
      isPlainObject(h) && typeof h["command"] === "string" && h["command"].includes(OCN_HOOK_MARKER),
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

export function mergeClaudeSettings(existingText: string | null): SettingsMergeResult {
  if (existingText === null) {
    const fresh: JsonObject = {
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
    if (!stopAdded && !postEditAdded) {
      return { ok: true, content: existingText, action: "skipped" };
    }
    return { ok: true, content: serialize(root), action: "updated" };
  } catch {
    return { ok: false, malformed: true };
  }
}
