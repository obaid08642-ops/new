import { describe, expect, it } from "vitest";
import { CALL_MODES, isCallMode, isTerminalCallMode, nextCallMode } from "./call-fallback";

/**
 * P15.4 — calls fall back to audio, then to chat. Chat is the floor: it never
 * degrades further, and the UI mode always matches the mode actually in use.
 */

describe("P15.4 — call fallback order", () => {
  it("degrades video to audio, audio to chat, and stops at chat", () => {
    expect(CALL_MODES).toEqual(["video", "audio", "chat"]);
    expect(nextCallMode("video")).toBe("audio");
    expect(nextCallMode("audio")).toBe("chat");
    expect(nextCallMode("chat")).toBe("chat");
  });

  it("treats chat as terminal and nothing else", () => {
    expect(isTerminalCallMode("chat")).toBe(true);
    expect(isTerminalCallMode("video")).toBe(false);
    expect(isTerminalCallMode("audio")).toBe(false);
  });

  it("validates mode values instead of trusting them", () => {
    expect(isCallMode("video")).toBe(true);
    expect(isCallMode("audio")).toBe(true);
    expect(isCallMode("chat")).toBe(true);
    expect(isCallMode("frozen-frame")).toBe(false);
    expect(isCallMode(null)).toBe(false);
  });
});
