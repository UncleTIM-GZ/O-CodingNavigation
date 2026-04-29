import { promises as fs } from "node:fs";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertPathInsideRoot,
  assertResolvedPathInsideRoot,
  validateProjectRoot,
} from "../../src/core/security/project-root.js";

describe("validateProjectRoot", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ocn-prv-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("rejects non-string input with ERR_IO_OR_CONFIG", async () => {
    const r = await validateProjectRoot(42 as unknown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.message.en).toMatch(/string/);
      expect(r.error.message.zh).toMatch(/字符串/);
    }
  });

  it("rejects empty string", async () => {
    const r = await validateProjectRoot("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
  });

  it("rejects null-byte injection", async () => {
    const r = await validateProjectRoot("/tmp/foo\0bar");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.en).toMatch(/null/);
  });

  it("rejects relative paths", async () => {
    const r = await validateProjectRoot("./relative/path");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ERR_IO_OR_CONFIG");
      expect(r.error.message.en).toMatch(/absolute/);
    }
  });

  it("rejects a non-existent path", async () => {
    const r = await validateProjectRoot(join(dir, "does-not-exist"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.en).toMatch(/does not exist/);
  });

  it("rejects a file (not a directory)", async () => {
    const filePath = join(dir, "not-a-dir.txt");
    await writeFile(filePath, "hello");
    const r = await validateProjectRoot(filePath);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.en).toMatch(/not a directory/);
  });

  it("accepts a valid absolute directory and returns its realpath", async () => {
    const real = await fs.realpath(dir);
    const r = await validateProjectRoot(dir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.projectRoot).toBe(real);
  });

  it("normalises `..` segments inside an absolute path before stat", async () => {
    // /tmp/foo/../foo === /tmp/foo
    const odd = `${dir}${sep}..${sep}${dir.split(sep).pop()}`;
    const r = await validateProjectRoot(odd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.projectRoot).toBe(await fs.realpath(dir));
  });

  it("follows symlinks and returns the resolved canonical path", async () => {
    const target = join(dir, "real-project");
    await mkdir(target);
    const link = join(dir, "link-to-project");
    await symlink(target, link);

    const r = await validateProjectRoot(link);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Canonical realpath equals the target's realpath, NOT the symlink path.
      expect(r.projectRoot).toBe(await fs.realpath(target));
    }
  });

  it("rejects a broken symlink (realpath fails)", async () => {
    const link = join(dir, "broken-link");
    await symlink(join(dir, "no-such-target"), link);
    const r = await validateProjectRoot(link);
    expect(r.ok).toBe(false);
  });
});

describe("assertPathInsideRoot (sync)", () => {
  it("returns true when target equals root", () => {
    expect(assertPathInsideRoot("/a/b/c", "/a/b/c")).toBe(true);
  });

  it("returns true when target is a descendant", () => {
    expect(assertPathInsideRoot("/a/b", "/a/b/c/d.txt")).toBe(true);
  });

  it("returns false for a sibling outside the root", () => {
    expect(assertPathInsideRoot("/a/b", "/a/c")).toBe(false);
  });

  it("returns false for a path that uses ../ to escape", () => {
    expect(assertPathInsideRoot("/a/b", "/a/b/../c")).toBe(false);
  });

  it("returns false for an absolute target outside the root", () => {
    expect(assertPathInsideRoot("/a/b", "/etc/passwd")).toBe(false);
  });

  it("returns false when either path is not absolute", () => {
    expect(assertPathInsideRoot("a/b", "/a/b/c")).toBe(false);
    expect(assertPathInsideRoot("/a/b", "a/b/c")).toBe(false);
  });

  it("does not match prefix collisions (e.g. /a/b vs /a/bb)", () => {
    expect(assertPathInsideRoot("/a/b", "/a/bb")).toBe(false);
    expect(assertPathInsideRoot("/a/b", "/a/bb/inner")).toBe(false);
  });
});

describe("assertResolvedPathInsideRoot (async, symlink-aware)", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ocn-prv-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns true for a real subdirectory", async () => {
    const sub = join(dir, "sub");
    await mkdir(sub);
    expect(await assertResolvedPathInsideRoot(dir, sub)).toBe(true);
  });

  it("returns true when both arguments resolve to the same canonical path", async () => {
    // dir itself
    expect(await assertResolvedPathInsideRoot(dir, dir)).toBe(true);
  });

  it("returns false when target symlinks out of the root", async () => {
    const outside = await mkdtemp(join(tmpdir(), "ocn-outside-"));
    try {
      const escape = join(dir, "escape");
      await symlink(outside, escape);
      // The symlink lives inside `dir`, but its target is outside.
      expect(await assertResolvedPathInsideRoot(dir, escape)).toBe(false);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("returns false for non-existent target", async () => {
    expect(
      await assertResolvedPathInsideRoot(dir, join(dir, "does-not-exist")),
    ).toBe(false);
  });

  it("returns false for non-existent root", async () => {
    expect(await assertResolvedPathInsideRoot("/no/such/dir", dir)).toBe(false);
  });

  it("anchors to realpath when root itself is a symlink", async () => {
    const real = join(dir, "real");
    await mkdir(real);
    const link = join(dir, "link");
    await symlink(real, link);
    const sub = resolve(real, "sub");
    await mkdir(sub);
    expect(await assertResolvedPathInsideRoot(link, sub)).toBe(true);
  });
});
