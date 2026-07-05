import type { BilingualMessage } from "../../types/i18n.js";
import type { ProjectState } from "../../types/state.js";
import { msg } from "../i18n.js";

// `ocn stop` — shared "OCN is stopped" predicate + notice text. Every
// AI-facing runtime surface (brief / next-prompt / advance / status / the
// Stop hook) checks `isStopped` at its earliest point and, when true, goes
// quiet or politely refuses instead of driving the workflow. Centralised here
// so the wording stays identical across surfaces.

/** True once the human has run `ocn stop` (a terminal, one-way transition). */
export function isStopped(state: Pick<ProjectState, "stoppedAt">): boolean {
  return state.stoppedAt !== null;
}

/** The banner shown by every runtime surface after `ocn stop`. */
export const STOPPED_NOTICE: BilingualMessage = msg(
  "OCN has been stopped for this project (`ocn stop`). The runtime no longer " +
    "drives it and the injected Claude Code wiring was uninstalled — you are in " +
    "free self-development mode. To resume OCN, re-wire with `ocn agent setup`.",
  "本项目已终止 OCN（`ocn stop`）。运行时不再驱动它、注入的 Claude Code 集成已卸载" +
    "——已进入自由自我开发模式。如需恢复 OCN，请重跑 `ocn agent setup` 重新接线。",
);

/** The single-line governance reminder used in stopped briefs / prompts. */
export const STOPPED_REMINDER =
  "OCN is stopped (`ocn stop`) — the runtime no longer governs this project. " +
  "No OCN gate, brief, or next-step applies; develop freely.";
