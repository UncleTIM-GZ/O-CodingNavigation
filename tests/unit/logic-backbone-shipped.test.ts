import { promises as fs } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLogicBackbone } from "../../src/core/artifact/logic-backbone-parser.js";
import { validateLogicBackbone } from "../../src/core/gate/logic-backbone-validator.js";
import { getTemplate } from "../../src/core/templates/index.js";

// Guards the two shipped logic-backbone documents: the bundled template (a
// fresh `ocn doc create logic-backbone` must pass its own gate) and OCN's own
// dogfood backbone at docs/19. Both must parse and validate clean.

function expectValid(content: string): void {
  const parsed = parseLogicBackbone(content);
  expect(parsed.found).toBe(true);
  expect(parsed.errors).toEqual([]);
  expect(parsed.graph).not.toBeNull();
  if (parsed.graph !== null) {
    expect(validateLogicBackbone(parsed.graph).status).toBe("pass");
  }
}

describe("shipped logic backbones", () => {
  it("the bundled template validates clean", () => {
    expectValid(getTemplate("logic-backbone").template);
  });

  it("docs/07-logic-backbone.md (OCN dogfood) validates clean", async () => {
    const content = await fs.readFile(join(process.cwd(), "docs", "07-logic-backbone.md"), "utf8");
    expectValid(content);
  });
});
