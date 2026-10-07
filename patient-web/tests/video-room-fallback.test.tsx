import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { VideoRoomClient } from "../components-next/video-room-client";
import { isTerminalCallMode, nextCallMode } from "../lib/api/net/call-fallback";
import { shouldStartAudioOnly } from "../lib/api/net/connection";

/**
 * P15.4 — calls fall back to audio, then to chat.
 *
 * Static markup covers the idle frame (connecting, no premature chat link);
 * the fallback rule itself is a pure function with direct tests; and the
 * wiring between them is pinned by source assertions, the same technique
 * login-form.test.tsx uses for its no-credential guarantees.
 */

const labels = {
  connecting: "Connecting…",
  ended: "Call ended",
  leave: "Leave",
  mute: "Mute",
  camera: "Camera",
  audioOnly: "Weak connection — the call started audio-only.",
  chatFallback: "Continue in chat",
};

describe("P15.4 — call fallback UI", () => {
  it("opens in the connecting frame with no fallback links yet", () => {
    const html = renderToStaticMarkup(<VideoRoomClient token="t" room="r" chatHref="/en/chat" labels={labels} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Connecting…");
    // Ended-state affordances (chat link, ended notice) must not leak into the
    // connecting frame.
    expect(html).not.toContain("/en/chat");
    expect(html).not.toContain("Call ended");
  });

  it("wires the audio-only start to the connection, not to a constant", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/video-room-client.tsx"), "utf8");
    expect(source).toContain("shouldStartAudioOnly");
    // Camera starts off on slow links…
    expect(source).toMatch(/useState\(\(\) => !shouldStartAudioOnly\(\)\)/);
    // …and the LiveKit join skips the camera there too.
    expect(source).toContain("setMicrophoneEnabled(true)");
    expect(source).toContain("enableCameraAndMicrophone()");
  });

  it("offers chat, not a dead end, when the call is over", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/video-room-client.tsx"), "utf8");
    expect(source).toContain("chatHref");
    expect(source).toContain("labels.chatFallback");
  });

  it("ends the degradation ladder at chat", () => {
    // A re-offended chat leg must not cycle back to video and redial.
    let mode = nextCallMode("video");
    expect(mode).toBe("audio");
    mode = nextCallMode(mode);
    expect(mode).toBe("chat");
    expect(isTerminalCallMode(mode)).toBe(true);
    expect(nextCallMode(mode)).toBe("chat");
    expect(shouldStartAudioOnly({ effectiveType: "unknown", saveData: false, slow: false, rttMs: null })).toBe(false);
  });
});
