import type { RequiredSectionDef } from "../../types/artifact.js";
import type { SopProfile } from "../../types/sop.js";
import { artifactsYaml } from "../../sops/default-ai-coding-sop/0.1.0/artifacts.js";
import { defaultConfigYaml } from "../../sops/default-ai-coding-sop/0.1.0/config.js";
import { gatesYaml } from "../../sops/default-ai-coding-sop/0.1.0/gates.js";
import { sopYaml } from "../../sops/default-ai-coding-sop/0.1.0/sop.js";

const PRD_REQUIRED_SECTIONS: readonly RequiredSectionDef[] = [
  {
    id: "section_problem",
    canonical: "Problem",
    aliases: ["Problem｜问题", "问题"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_goals",
    canonical: "Goals",
    aliases: ["Goals｜目标", "目标"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_users",
    canonical: "Users",
    aliases: ["Users｜用户", "用户"],
    allowedLevels: [2, 3],
  },
  {
    id: "section_scenarios",
    canonical: "Scenarios",
    aliases: [
      "Scenarios｜使用场景",
      "使用场景",
      "Use Cases",
      "User Scenarios",
      "用户场景",
    ],
    allowedLevels: [2, 3],
  },
  {
    id: "section_requirements",
    canonical: "Requirements",
    aliases: ["Requirements｜需求", "需求"],
    allowedLevels: [2, 3],
  },
];

export function loadSopProfile(): SopProfile {
  return {
    id: "default-ai-coding-sop",
    version: "0.1.0",
    sopYaml,
    gatesYaml,
    artifactsYaml,
    defaultConfigYaml,
    requiredSectionsForStep: (stepId: string): readonly RequiredSectionDef[] =>
      stepId === "step_prd" ? PRD_REQUIRED_SECTIONS : [],
  };
}
