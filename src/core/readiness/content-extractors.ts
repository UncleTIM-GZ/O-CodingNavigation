import { promises as fs } from "node:fs";
import { join } from "node:path";
import { globToRegExp } from "./artifact-resolver.js";

// SOP 0.4.0 P3 — deterministic README content extractors for the two
// rulebook fields that are content checks on a repo-probed file:
//
//   support_channel — README must contain an email address OR an
//     issues/discussions URL. A bare "## Contact" heading does NOT pass
//     (falsifiability rule: a heading is "we discussed it"; an address is
//     an actionable pointer). Note this is a cheat≈fix check (red-team G7):
//     fabricating a contact costs the same as adding a real one.
//
//   quickstart — README must contain a quickstart/usage-class heading AND
//     at least one fenced code block (runnable steps, not just prose).
//
// Any other field stays UNKNOWN — no extractor, no silent pass.

export interface ContentVerdict {
  readonly status: "pass" | "fail" | "unknown";
  readonly note: string;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
const ISSUES_URL_RE = /https?:\/\/\S*(issues|discussions)/i;
const QUICKSTART_HEADING_RE = /^#{1,4}\s.*(quick ?start|getting started|usage|install|用法|快速上手|快速开始|安装|使用)/im;
const FENCED_BLOCK_RE = /^```/m;

async function readFirstMatch(root: string, patterns: readonly string[]): Promise<string | null> {
  for (const pattern of patterns) {
    const slash = pattern.lastIndexOf("/");
    const dir = slash === -1 ? root : join(root, pattern.slice(0, slash));
    const namePattern = slash === -1 ? pattern : pattern.slice(slash + 1);
    const re = globToRegExp(namePattern);
    let names: string[] = [];
    try {
      names = (await fs.readdir(dir)).filter((n) => re.test(n)).sort();
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        const text = await fs.readFile(join(dir, name), "utf8");
        if (text.trim().length > 0) return text;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function evalReadmeContentField(
  root: string,
  field: string,
  readmePatterns: readonly string[],
): Promise<ContentVerdict> {
  const text = await readFirstMatch(root, readmePatterns);
  if (text === null) {
    return { status: "unknown", note: `${field}: no README found to inspect` };
  }
  if (field === "support_channel") {
    if (EMAIL_RE.test(text) || ISSUES_URL_RE.test(text)) {
      return { status: "pass", note: `${field}: README has an email or issues/discussions link` };
    }
    return {
      status: "fail",
      note: `${field}: README has no email address and no issues/discussions URL`,
    };
  }
  if (field === "quickstart") {
    const hasHeading = QUICKSTART_HEADING_RE.test(text);
    const hasCode = FENCED_BLOCK_RE.test(text);
    if (hasHeading && hasCode) {
      return { status: "pass", note: `${field}: quickstart heading + runnable code block` };
    }
    return {
      status: "fail",
      note: `${field}: README lacks ${hasHeading ? "a fenced code block" : "a quickstart/usage heading"}`,
    };
  }
  return { status: "unknown", note: `${field}: no content extractor for this field` };
}
