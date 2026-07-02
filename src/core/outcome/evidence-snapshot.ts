import { createHash } from "node:crypto";
import { promises as fs, type Dirent, type Stats } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import type { EvidenceFile } from "../../types/outcome-ledger.js";
import { assertResolvedPathInsideRoot } from "../security/project-root.js";

// SOP 0.9.0 (AM-016) — the evidence snapshot. Fingerprints the files a probe's
// verdict rests on so a passing measurement is forgery-EVIDENT (not proof:
// this is a declared boundary — no crypto). Hardening from the security review:
//   • realpath + inside-root on EVERY hit — a symlinked PARENT dir escapes a
//     leaf-only lstat, so we resolve the full path (Sec-H3).
//   • absolute / `..` source patterns rejected at the door.
//   • per-file size cap, hit-count cap, aggregate-byte cap → treated as no-hit.
//   • evidenceHash is domain-separated (sorted `path\0sha256\n`), never raw
//     concatenation, so [A,B] can't collide with [AB] (Sec-L1).

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_HITS = 500;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** A source pattern must be a repo-relative glob. Absolute or `..`-bearing
 *  patterns are rejected (containment can't be reasoned about). */
export function isSafeSourcePattern(pattern: string): boolean {
  if (pattern.length === 0 || isAbsolute(pattern)) return false;
  return !pattern.split(/[\\/]/).includes("..");
}

function globToRegExp(pattern: string): RegExp {
  const posix = pattern.replace(/\\/g, "/");
  let re = "";
  for (let i = 0; i < posix.length; i++) {
    const c = posix[i]!;
    if (c === "*") {
      if (posix[i + 1] === "*") {
        re += ".*"; // ** crosses directory separators
        i++;
        if (posix[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

async function walk(root: string, dir: string, out: string[]): Promise<void> {
  if (out.length > MAX_HITS * 4) return;
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      await walk(root, abs, out);
    } else if (e.isFile()) {
      out.push(relative(root, abs).split(sep).join("/"));
    }
  }
}

async function hashHit(root: string, rel: string): Promise<EvidenceFile | null> {
  const abs = join(root, rel);
  if (!(await assertResolvedPathInsideRoot(root, abs))) return null; // symlink escape
  let stat: Stats;
  try {
    stat = await fs.stat(abs);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
  let buf: Buffer;
  try {
    buf = await fs.readFile(abs);
  } catch {
    return null;
  }
  return { path: rel, sha256: sha256Hex(buf), bytes: buf.length };
}

export interface EvidenceSnapshot {
  /** "" ⟺ zero hits (forced NO_EVIDENCE). */
  readonly evidenceHash: string;
  readonly evidenceFiles: readonly EvidenceFile[];
}

/** Domain-separated merged hash of the (sorted) hit set. */
function mergeHash(files: readonly EvidenceFile[]): string {
  if (files.length === 0) return "";
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const h = createHash("sha256");
  for (const f of sorted) h.update(`${f.path}\0${f.sha256}\n`);
  return h.digest("hex");
}

export async function snapshotEvidence(root: string, source: string): Promise<EvidenceSnapshot> {
  if (!isSafeSourcePattern(source)) return { evidenceHash: "", evidenceFiles: [] };
  const all: string[] = [];
  await walk(root, root, all);
  const re = globToRegExp(source);
  const hits = all.filter((p) => re.test(p)).sort();
  const files: EvidenceFile[] = [];
  let totalBytes = 0;
  for (const rel of hits) {
    if (files.length >= MAX_HITS) break;
    const ef = await hashHit(root, rel);
    if (ef === null) continue;
    totalBytes += ef.bytes;
    if (totalBytes > MAX_TOTAL_BYTES) return { evidenceHash: "", evidenceFiles: [] };
    files.push(ef);
  }
  return { evidenceHash: mergeHash(files), evidenceFiles: files };
}

/** Hash the probe program's entry file so editing it to fabricate a value
 *  leaves a trace (invariant §7). Heuristic: the first repo-relative existing
 *  file token in the command. Returns "" (unresolved) if none — the caller
 *  states "probe program not snapshotted" in the PASS message. NOTE (declared
 *  boundary): this covers the entry file, NOT its transitive `require` closure. */
export async function probeEntryHash(root: string, command: string): Promise<string> {
  const tokens = command.split(/\s+/).filter((t) => t.length > 0 && !t.includes("="));
  for (const raw of tokens) {
    const tok = raw.replace(/^['"]|['"]$/g, "");
    if (tok.length === 0 || isAbsolute(tok) || tok.split(/[\\/]/).includes("..")) continue;
    const abs = join(root, tok);
    if (!(await assertResolvedPathInsideRoot(root, abs))) continue;
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) return sha256Hex(await fs.readFile(abs));
    } catch {
      /* not a file — keep scanning */
    }
  }
  return "";
}
