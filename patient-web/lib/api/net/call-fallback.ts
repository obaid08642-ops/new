/**
 * P15.4 — calls fall back to audio, then to chat.
 *
 * The rule, as a pure function: a video leg that cannot be established drops
 * to audio-only; audio that cannot be established drops to chat. Each step is
 * terminal-safe (chat never "falls back" further), and the mode the UI shows
 * is always the mode actually in use — never a video frame that is frozen.
 */

export const CALL_MODES = ["video", "audio", "chat"] as const;

export type CallMode = (typeof CALL_MODES)[number];

export function isCallMode(value: unknown): value is CallMode {
  return value === "video" || value === "audio" || value === "chat";
}

/** The next degraded mode after `failed` broke. Chat is the floor. */
export function nextCallMode(failed: CallMode): CallMode {
  if (failed === "video") return "audio";
  return "chat";
}

/** True once there is nothing left to degrade to. */
export function isTerminalCallMode(mode: CallMode): boolean {
  return mode === "chat";
}
