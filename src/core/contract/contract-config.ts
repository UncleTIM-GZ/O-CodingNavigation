import { promises as fs } from "node:fs";
import yaml from "js-yaml";
import { ContractConfig } from "../../types/api-contract.js";
import { Paths } from "../paths.js";

// AM-012 D8 — the `contract:` block of the user-owned config.yaml. Reads are
// defensive in the FAIL-SAFE direction: an absent file, broken YAML, or an
// invalid block all resolve to disabled, so a misconfiguration can never
// silently activate the contract drift gate. Mirrors readAutomationConfig.

export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  enabled: false,
  declaration: "docs/06-api-contract.md",
  frontendRoot: "src",
};

export async function readContractConfig(root: string): Promise<ContractConfig> {
  let text: string;
  try {
    text = await fs.readFile(Paths.configFile(root), "utf8");
  } catch {
    return DEFAULT_CONTRACT_CONFIG;
  }
  let raw: unknown;
  try {
    raw = yaml.load(text);
  } catch {
    return DEFAULT_CONTRACT_CONFIG;
  }
  if (raw === null || typeof raw !== "object") return DEFAULT_CONTRACT_CONFIG;
  const block = (raw as Record<string, unknown>)["contract"];
  if (block === undefined || block === null) return DEFAULT_CONTRACT_CONFIG;
  const parsed = ContractConfig.safeParse(block);
  return parsed.success ? parsed.data : DEFAULT_CONTRACT_CONFIG;
}
