import { z } from "zod";

export const Tier = z.enum(["minimal", "production", "full"]);
export type Tier = z.infer<typeof Tier>;

export const StateId = z.enum([
  "state_discovery",
  "state_spec",
  "state_design",
  "state_plan",
  "state_build",
  "state_verify",
  "state_ship",
  "state_reflect",
]);
export type StateId = z.infer<typeof StateId>;

export const StepId = z.string().regex(/^step_[a-z0-9_]+$/, {
  message: "Step IDs must use stable string form, prefix 'step_'",
});
export type StepId = z.infer<typeof StepId>;

export const ProjectInfo = z
  .object({
    projectId: z.string().min(1),
    name: z.string().min(1),
    tier: Tier,
    sopProfileId: z.string().min(1),
    sopProfileVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "semver required"),
  })
  .strict();
export type ProjectInfo = z.infer<typeof ProjectInfo>;

export const ProjectState = z
  .object({
    schemaVersion: z.literal("1.0"),
    project: ProjectInfo,
    currentStateId: StateId,
    currentStepId: StepId,
    artifacts: z.record(z.string(), z.unknown()).default({}),
    latestGateResult: z.unknown().nullable().default(null),
    // `ocn stop` (engine/CLI feature, NOT an SOP bump) — terminal detach
    // marker. null = OCN still drives the project; an ISO 8601 UTC timestamp =
    // the human ran `ocn stop`, so the runtime goes quiet and the injected
    // Claude Code wiring is uninstalled (one-way). `.default(null)` keeps
    // pre-existing state.json (written before this field) parsing byte-compatibly.
    // Must be ISO 8601 UTC ending "Z" (CLAUDE.md §4.3) so garbage never silently
    // flips a project into the stopped state.
    stoppedAt: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
        "stoppedAt must be ISO 8601 UTC ending Z",
      )
      .nullable()
      .default(null),
  })
  .strict();
export type ProjectState = z.infer<typeof ProjectState>;
