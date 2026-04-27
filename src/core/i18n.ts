import type { BilingualMessage } from "../types/i18n.js";

export const msg = (en: string, zh: string): BilingualMessage => ({ en, zh });
