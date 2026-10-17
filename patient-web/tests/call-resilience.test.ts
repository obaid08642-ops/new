// P14.22: the web call room on a bad network (lib/consult/call-resilience.ts, used by components-next/video-room-client.tsx).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AudioPresets, ConnectionQuality, DisconnectReason, VideoPresets } from "livekit-client";
import { POOR_REPORTS_FOR_AUDIO_ONLY, callRoomOptions, poorConnectionTracker, setVideo, stateAfterDisconnect } from "@/lib/consult/call-resilience";

describe("call room settings", () => {
  it("adaptive stream, dynacast, simulcast 180p/360p, speech audio with DTX: the same as patient-app", () => {
    const o = callRoomOptions({ VideoPresets, AudioPresets });
    expect(o.adaptiveStream).toBe(true);
    expect(o.dynacast).toBe(true);
    expect(o.publishDefaults.simulcast).toBe(true);
    expect(o.publishDefaults.videoSimulcastLayers).toEqual([VideoPresets.h180, VideoPresets.h360]);
    expect(o.publishDefaults.dtx).toBe(true);
    expect(o.publishDefaults.audioPreset).toBe(AudioPresets.speech);
    const app = fs.readFileSync(path.join(__dirname, "../../patient-app/src/components/livekit-view.tsx"), "utf8");
    for (const s of ["adaptiveStream: true", "dynacast: true", "simulcast: true", "videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360]", "maxBitrate: 1_700_000", "audioPreset: AudioPresets.speech", "dtx: true"]) {
      expect(app, s).toContain(s);
    }
  });
});

describe("audio only on a poor connection", () => {
  it("switches after two poor reports in a row, not on one, and counts again after a good one", () => {
    const t = poorConnectionTracker();
    expect(POOR_REPORTS_FOR_AUDIO_ONLY).toBe(2);
    expect(t.report(ConnectionQuality.Poor, ConnectionQuality.Poor)).toBe(false);
    expect(t.report(ConnectionQuality.Good, ConnectionQuality.Poor)).toBe(false);
    expect(t.report(ConnectionQuality.Poor, ConnectionQuality.Poor)).toBe(false);
    expect(t.report(ConnectionQuality.Poor, ConnectionQuality.Poor)).toBe(true);
    t.reset();
    expect(t.report(ConnectionQuality.Poor, ConnectionQuality.Poor)).toBe(false);
  });

  it("video off both ways keeps the sound; video on again restores both", async () => {
    const pubs = [{ setSubscribed: vi.fn() }, { setSubscribed: vi.fn() }];
    const room = {
      localParticipant: { isCameraEnabled: true, setCameraEnabled: vi.fn(async function (this: { isCameraEnabled: boolean }, on: boolean) { room.localParticipant.isCameraEnabled = on; }), setMicrophoneEnabled: vi.fn() },
      remoteParticipants: new Map([["doctor", { videoTrackPublications: new Map([["v1", pubs[0]], ["v2", pubs[1]]]) }]]),
    };
    await setVideo(room, false);
    expect(room.localParticipant.isCameraEnabled).toBe(false);
    expect(pubs.every((p) => p.setSubscribed.mock.calls.at(-1)?.[0] === false)).toBe(true);
    expect(room.localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
    await setVideo(room, true);
    expect(room.localParticipant.isCameraEnabled).toBe(true);
    expect(pubs.every((p) => p.setSubscribed.mock.calls.at(-1)?.[0] === true)).toBe(true);
  });

  it("a camera that refuses to turn off does not break the switch", async () => {
    const room = { localParticipant: { isCameraEnabled: true, setCameraEnabled: vi.fn().mockRejectedValue(new Error("busy")) }, remoteParticipants: new Map() };
    await expect(setVideo(room, false)).resolves.toBeUndefined();
  });
});

describe("a dropped call", () => {
  it("the patient leaving ends the call; any other reason (network, server) is a drop that offers the chat", () => {
    expect(stateAfterDisconnect(DisconnectReason.CLIENT_INITIATED, DisconnectReason.CLIENT_INITIATED)).toBe("ended");
    expect(stateAfterDisconnect(undefined, DisconnectReason.CLIENT_INITIATED)).toBe("ended");
    expect(stateAfterDisconnect(DisconnectReason.JOIN_FAILURE, DisconnectReason.CLIENT_INITIATED)).toBe("dropped");
    expect(stateAfterDisconnect(DisconnectReason.SIGNAL_CLOSE, DisconnectReason.CLIENT_INITIATED)).toBe("dropped");
  });

  it("both call pages pass the new labels, and the appointment's chat link", () => {
    for (const page of ["app/[locale]/room/[id]/page.tsx", "app/[locale]/consultations/video-call/page.tsx"]) {
      const src = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
      for (const k of ["callReconnecting", "callAudioOnly", "callTryVideo", "callDropped", "callContinueInChat"]) expect(src, `${page} ${k}`).toContain(`c("${k}")`);
      expect(src).toMatch(/chatHref=\{.*\/appointments\/\$\{appointmentId\}\/chat/);
    }
  });
});
