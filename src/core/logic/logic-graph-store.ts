import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { LogicGraph } from "../../types/logic-backbone.js";
import { Paths } from "../paths.js";

// Persists the validated logic-backbone graph as the machine source of truth
// under .ocoding/logic-graph.json. Atomic temp+rename (same discipline as the
// state store) so a concurrent reader never sees a half-written file. The file
// is derived from the artifact and regenerated on every passing gate run.

export async function writeLogicGraphProjection(root: string, graph: LogicGraph): Promise<void> {
  const file = Paths.logicGraphFile(root);
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(graph, null, 2) + "\n";
  try {
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

// Reads the persisted projection, or null when absent / unparseable. Used by
// the brief integration so BUILD-phase prompts can surface the backbone
// without re-parsing Markdown.
export async function readLogicGraphProjection(root: string): Promise<LogicGraph | null> {
  let text: string;
  try {
    text = await fs.readFile(Paths.logicGraphFile(root), "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = LogicGraph.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
