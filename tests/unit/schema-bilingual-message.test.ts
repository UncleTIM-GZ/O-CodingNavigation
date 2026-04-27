import { describe, expect, it } from "vitest";
import { BilingualMessage } from "../../src/types/i18n.js";

describe("BilingualMessage schema", () => {
  // @ac AC-DOMAIN-001 (BilingualMessage)
  it("parses a valid message with both en and zh", () => {
    const result = BilingualMessage.safeParse({ en: "Hello", zh: "你好" });
    expect(result.success).toBe(true);
  });

  it("rejects when en is empty", () => {
    const result = BilingualMessage.safeParse({ en: "", zh: "你好" });
    expect(result.success).toBe(false);
  });

  it("rejects when zh is empty", () => {
    const result = BilingualMessage.safeParse({ en: "Hello", zh: "" });
    expect(result.success).toBe(false);
  });

  it("rejects extra unknown keys (strict)", () => {
    const result = BilingualMessage.safeParse({ en: "Hello", zh: "你好", extra: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects when zh is missing", () => {
    const result = BilingualMessage.safeParse({ en: "Hello" });
    expect(result.success).toBe(false);
  });
});
