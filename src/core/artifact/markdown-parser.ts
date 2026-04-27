import type { Heading } from "../../types/artifact.js";

// Hand-rolled ATX heading parser (see plan §3.2 — zero deps for Skeleton Spike).
// Skips fenced code blocks. Preserves heading text verbatim (no normalization here —
// normalization happens in the matcher so the parser stays domain-agnostic).
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*$/;
const FENCE_PATTERN = /^\s*```/;

export function parseHeadings(md: string): readonly Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (FENCE_PATTERN.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(HEADING_PATTERN);
    if (!match) continue;
    const hashes = match[1];
    const text = match[2];
    if (!hashes || !text) continue;
    out.push({ level: hashes.length, text: text.trim(), line: i + 1 });
  }
  return out;
}
