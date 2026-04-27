import { z } from "zod";

export const BilingualMessage = z
  .object({
    en: z.string().min(1),
    zh: z.string().min(1),
  })
  .strict();

export type BilingualMessage = z.infer<typeof BilingualMessage>;
