import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { evalReadmeContentField } from "../../src/core/readiness/content-extractors.js";
import { evaluateReadiness } from "../../src/core/readiness/evaluator.js";
import { parseReadinessRulebook } from "../../src/core/readiness/rulebook-loader.js";
import { readinessYaml } from "../../src/sops/default-ai-coding-sop/0.4.0/readiness.js";
import { createTempProject, type TempProject } from "../helpers/temp-project.js";

// P3 — README content extractors. Falsifiability rule: a bare "## Contact"
// heading is "we discussed it" and must NOT pass; an email or issues URL is
// an actionable pointer and does.

describe("README content extractors", () => {
  let project: TempProject;
  beforeEach(async () => {
    project = await createTempProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  async function writeReadme(text: string): Promise<void> {
    await fs.writeFile(join(project.cwd, "README.md"), text, "utf8");
  }

  it("support_channel: issues URL or email passes", async () => {
    await writeReadme("# X\n\nReport bugs: https://github.com/o/r/issues\n");
    expect((await evalReadmeContentField(project.cwd, "support_channel", ["README*"])).status).toBe(
      "pass",
    );
    await writeReadme("# X\n\n联系: dev@example.com\n");
    expect((await evalReadmeContentField(project.cwd, "support_channel", ["README*"])).status).toBe(
      "pass",
    );
  });

  it("support_channel: a bare Contact heading does NOT pass", async () => {
    await writeReadme("# X\n\n## Contact\n\n欢迎联系我们。\n");
    const v = await evalReadmeContentField(project.cwd, "support_channel", ["README*"]);
    expect(v.status).toBe("fail");
  });

  it("support_channel: missing README → unknown (open world)", async () => {
    const v = await evalReadmeContentField(project.cwd, "support_channel", ["README*"]);
    expect(v.status).toBe("unknown");
  });

  it("quickstart: heading + fenced code block passes; heading alone fails", async () => {
    await writeReadme("# X\n\n## Quick Start\n\n```bash\nnpm i\n```\n");
    expect((await evalReadmeContentField(project.cwd, "quickstart", ["README*"])).status).toBe(
      "pass",
    );
    await writeReadme("# X\n\n## Quick Start\n\njust run it.\n");
    expect((await evalReadmeContentField(project.cwd, "quickstart", ["README*"])).status).toBe(
      "fail",
    );
  });

  it("unregistered fields stay unknown — no silent pass", async () => {
    await writeReadme("# X\n");
    const v = await evalReadmeContentField(project.cwd, "some_future_field", ["README*"]);
    expect(v.status).toBe("unknown");
  });

  it("shipped rulebook: rdy_service_desk_analyst flips UNKNOWN→FAIL→PASS", async () => {
    const rulebook = parseReadinessRulebook(readinessYaml).rulebook;
    expect(rulebook).not.toBeNull();
    const evalOnce = async (): Promise<string | undefined> => {
      const ledger = await evaluateReadiness({
        root: project.cwd,
        rulebook: rulebook!,
        projectTier: "minimal",
        commands: {},
      });
      return ledger.checks.find((c) => c.id === "rdy_service_desk_analyst")?.verdict;
    };
    expect(await evalOnce()).toBe("UNKNOWN"); // no README at all
    await writeReadme("# X\n\nA tool.\n");
    expect(await evalOnce()).toBe("FAIL"); // README without a channel
    await writeReadme("# X\n\nIssues: https://github.com/o/r/issues\n");
    expect(await evalOnce()).toBe("PASS");
  });
});
