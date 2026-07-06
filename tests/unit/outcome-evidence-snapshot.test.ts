import { tmpdir } from "node:os";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isSafeSourcePattern,
  probeEntryHash,
  snapshotEvidence,
} from "../../src/core/outcome/evidence-snapshot.js";

// SOP 0.9.0 (AM-017) P2 — the evidence snapshot is forgery-EVIDENT: it skips
// symlinks (parent-dir escape), forces NO_EVIDENCE on zero hits, and covers the
// probe program entry file so editing it to fabricate a value leaves a trace.

let root: string;
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(join(tmpdir(), "ocn-evid-")));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("isSafeSourcePattern", () => {
  it("rejects absolute and .. patterns, accepts relative globs", () => {
    expect(isSafeSourcePattern("dist/**/*.js")).toBe(true);
    expect(isSafeSourcePattern("/etc/passwd")).toBe(false);
    expect(isSafeSourcePattern("../secrets/*")).toBe(false);
    expect(isSafeSourcePattern("")).toBe(false);
  });
});

describe("snapshotEvidence", () => {
  it("hashes matching files and produces a stable non-empty evidenceHash", async () => {
    await fs.mkdir(join(root, "dist"), { recursive: true });
    await fs.writeFile(join(root, "dist", "a.json"), "1");
    await fs.writeFile(join(root, "dist", "b.json"), "2");
    const snap = await snapshotEvidence(root, "dist/**");
    expect(snap.evidenceFiles.map((f) => f.path).sort()).toEqual(["dist/a.json", "dist/b.json"]);
    expect(snap.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    const again = await snapshotEvidence(root, "dist/**");
    expect(again.evidenceHash).toBe(snap.evidenceHash); // deterministic
  });

  it("zero hits → empty evidenceHash (forces NO_EVIDENCE upstream)", async () => {
    const snap = await snapshotEvidence(root, "dist/**");
    expect(snap.evidenceHash).toBe("");
    expect(snap.evidenceFiles).toEqual([]);
  });

  it("skips a symlink whose target escapes the root", async () => {
    const outside = await fs.mkdtemp(join(tmpdir(), "ocn-outside-"));
    await fs.writeFile(join(outside, "secret.json"), "x");
    await fs.mkdir(join(root, "dist"), { recursive: true });
    await fs.symlink(join(outside, "secret.json"), join(root, "dist", "link.json"));
    const snap = await snapshotEvidence(root, "dist/**");
    expect(snap.evidenceFiles).toEqual([]); // symlink escape not hashed
    await fs.rm(outside, { recursive: true, force: true });
  });

  it("domain-separated hash: [a,b] ≠ a-concat-b collision", async () => {
    await fs.mkdir(join(root, "d"), { recursive: true });
    await fs.writeFile(join(root, "d", "1.txt"), "AB");
    const one = await snapshotEvidence(root, "d/**");
    await fs.writeFile(join(root, "d", "2.txt"), "");
    const two = await snapshotEvidence(root, "d/**");
    expect(two.evidenceHash).not.toBe(one.evidenceHash);
  });
});

describe("probeEntryHash", () => {
  it("hashes the first existing local file token in the command", async () => {
    await fs.mkdir(join(root, "scripts"), { recursive: true });
    await fs.writeFile(join(root, "scripts", "probe.js"), "console.log(1)");
    const h1 = await probeEntryHash(root, "node scripts/probe.js");
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    await fs.writeFile(join(root, "scripts", "probe.js"), "console.log(999)"); // tamper
    const h2 = await probeEntryHash(root, "node scripts/probe.js");
    expect(h2).not.toBe(h1); // editing the probe leaves a trace
  });

  it("skips env-assignment tokens and returns '' when no local file resolves", async () => {
    const h = await probeEntryHash(root, "FOO=1 true");
    expect(h).toBe("");
  });
});
