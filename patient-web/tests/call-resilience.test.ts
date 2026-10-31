// P14.22: the web call room on a bad network (lib/consult/call-resilience.ts, used by components-next/video-room-client.tsx).
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioPresets, ConnectionQuality, DisconnectReason, VideoPresets } from "livekit-client";
import { POOR_REPORTS_FOR_AUDIO_ONLY, RECONNECT_DEADLINE_MS, callRoomOptions, poorConnectionTracker, qualityLevel, reconnectClock, setVideo, stateAfterDisconnect } from "@/lib/consult/call-resilience";

describe("call room settings", () => {
  it("adaptive stream, dynacast, simulcast 180p/360p, speech audio with DTX: the same as patient-app", () => {
    const o = callRoomOptions({ VideoPresets, AudioPresets });
    expect(o.adaptiveStream).toBe(true);
    expect(o.dynacast).toBe(true);
    expect(o.publishDefaults.simulcast).toBe(true);
    expect(o.publishDefaults.videoSimulcastLayers).toEqual([VideoPresets.h180, VideoPresets.h360]);
    expect(o.publishDefaults.dtx).toBe(true);
    expect(o.publishDefaults.audioPreset).toBe(AudioPresets.speech);
    // The app builds its room from the same options (patient-app/src/calls/callResilience.ts, used by app/consultations/video-call.tsx):
    // the web, the app and the app's own copy of the options must keep the same settings.
    const appCopy = fs.readFileSync(path.join(__dirname, "../../patient-app/src/calls/callResilience.ts"), "utf8");
    for (const s of ["adaptiveStream: true", "dynacast: true", "simulcast: true", "videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360]", "maxBitrate: 1_700_000", "audioPreset: AudioPresets.speech", "dtx: true"]) {
      expect(appCopy, s).toContain(s);
    }
    const appScreen = fs.readFileSync(path.join(__dirname, "../../patient-app/app/consultations/video-call.tsx"), "utf8");
    expect(appScreen).toContain("callRoomOptions({ VideoPresets, AudioPresets })");
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

describe("a lost connection resumes the same call; only ~30 s without it ends the call", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("the deadline is 30 s, fires once, and a second 'reconnecting' does not restart the clock", () => {
    vi.useFakeTimers();
    const expired = vi.fn();
    const clock = reconnectClock(expired);
    expect(RECONNECT_DEADLINE_MS).toBe(30_000);
    clock.start();
    vi.advanceTimersByTime(20_000);
    clock.start();
    vi.advanceTimersByTime(9_999);
    expect(expired).not.toHaveBeenCalled();
    expect(clock.running()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(clock.running()).toBe(false);
  });

  it("coming back (stop) cancels it, and it can run again on the next loss", () => {
    vi.useFakeTimers();
    const expired = vi.fn();
    const clock = reconnectClock(expired);
    clock.start();
    vi.advanceTimersByTime(10_000);
    clock.stop();
    vi.advanceTimersByTime(60_000);
    expect(expired).not.toHaveBeenCalled();
    clock.start();
    vi.advanceTimersByTime(30_000);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("quality levels", () => {
    expect(["excellent", "good", "poor", "lost", "weird", undefined].map(qualityLevel)).toEqual(["excellent", "good", "poor", "lost", "unknown", "unknown"]);
  });
});

describe("the web room is wired to it, in every language", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

  it("reconnecting (also the signal-only one) starts the clock, reconnected stops it, the server's advice starts sound only, each side has a quality label", () => {
    const src = read("components-next/video-room-client.tsx");
    for (const s of ["RoomEvent.Reconnecting", "RoomEvent.SignalReconnecting", "RoomEvent.Reconnected", "reconnectClock(", "startAudioOnly", "data-quality=\"local\"", "data-quality=\"remote\"", "labels.qualityYou", "labels.qualityOther"]) expect(src, s).toContain(s);
    for (const page of ["app/[locale]/consultations/video-call/page.tsx", "app/[locale]/room/[id]/page.tsx"]) {
      const p = read(page);
      expect(p, page).toContain("startAudioOnly=");
      expect(p, page).toContain("callQualityExcellent");
    }
  });

  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s has every call quality label", (l) => {
    const web = JSON.parse(read(`messages/${l}.json`)).ConsultWeb;
    for (const k of ["callQualityYou", "callQualityOther", "callQualityExcellent", "callQualityGood", "callQualityPoor", "callQualityLost", "callQualityUnknown"]) {
      expect(typeof web[k], `${l}.${k}`).toBe("string");
      expect(web[k].length).toBeGreaterThan(0);
    }
  });
});

describe("video codec (cross-platform matrix)", () => {
  it("publishes VP8 by default and falls back to H.264 only when the sender lacks VP8", async () => {
    const { pickVideoCodec } = await import("../lib/consult/call-resilience");
    expect(pickVideoCodec(undefined)).toBe("vp8");
    expect(pickVideoCodec([{ mimeType: "video/VP8" }, { mimeType: "video/H264" }])).toBe("vp8");
    expect(pickVideoCodec([{ mimeType: "video/H264" }])).toBe("h264");
    expect(pickVideoCodec([{ mimeType: "video/AV1" }])).toBe("vp8");
  });

  it("the room options carry the chosen codec", async () => {
    const { callRoomOptions } = await import("../lib/consult/call-resilience");
    const presets = { VideoPresets: { h720: { resolution: {} }, h180: {}, h360: {} }, AudioPresets: { speech: {} } } as never;
    expect(callRoomOptions(presets).publishDefaults.videoCodec).toBe("vp8");
    expect(callRoomOptions(presets, "h264").publishDefaults.videoCodec).toBe("h264");
  });
});

describe("poor link (T2 finding: ConnectionQualityChanged fires only on change)", () => {
  afterEach(() => vi.useRealTimers());

  it("a link that stays poor for POOR_LINK_MS drops to sound only, once; a better report first cancels it; a second poor report does not restart it", async () => {
    const { poorLinkClock, POOR_LINK_MS } = await import("@/lib/consult/call-resilience");
    vi.useFakeTimers();
    const fired = vi.fn();
    const clock = poorLinkClock(fired);
    clock.report(true);
    vi.advanceTimersByTime(POOR_LINK_MS - 1);
    expect(fired).not.toHaveBeenCalled();
    clock.report(true); // not restarted
    vi.advanceTimersByTime(1);
    expect(fired).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(POOR_LINK_MS * 3);
    expect(fired).toHaveBeenCalledTimes(1);

    clock.report(true);
    vi.advanceTimersByTime(POOR_LINK_MS / 2);
    clock.report(false); // got better in time
    vi.advanceTimersByTime(POOR_LINK_MS * 2);
    expect(fired).toHaveBeenCalledTimes(1);
  });
});

describe("leaving ends the session, and why a call credential was refused", () => {
  it("POST /api/patient/calls/:id/end with the session id; nothing without one; a failed request never throws", async () => {
    const { endCallSession } = await import("@/lib/consult/call-session");
    const ok = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await endCallSession(ok as unknown as typeof fetch, "3f2b8a0e-1111-4222-8333-444455556666")).toBe(true);
    expect(ok).toHaveBeenCalledWith("/api/patient/calls/3f2b8a0e-1111-4222-8333-444455556666/end", expect.objectContaining({ method: "POST", keepalive: true }));
    expect(await endCallSession(ok as unknown as typeof fetch, undefined)).toBe(false);
    expect(ok).toHaveBeenCalledTimes(1);
    expect(await endCallSession((async () => { throw new Error("offline"); }) as unknown as typeof fetch, "x")).toBe(false);
  });

  it("the end route is allowed through the proxy for a call id only (POST)", async () => {
    const { isAllowedPatientApiTarget } = await import("@/lib/api/patient-allowlist");
    const id = "3f2b8a0e-1111-4222-8333-444455556666";
    expect(isAllowedPatientApiTarget(`/calls/${id}/end`, "", "POST")).toBe(true);
    expect(isAllowedPatientApiTarget(`/calls/${id}/end`, "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget(`/calls/${id}/join`, "", "POST")).toBe(false);
    expect(isAllowedPatientApiTarget(`/calls/not-an-id/end`, "", "POST")).toBe(false);
  });

  it("an early or late join is not ready / ended, not a generic failure", async () => {
    const { callTokenFailure } = await import("@/lib/consult/call-session");
    expect(callTokenFailure(409, "")).toBe("not_ready");
    expect(callTokenFailure(400, '{"message":"call_token_outside_appointment_window"}')).toBe("not_ready");
    expect(callTokenFailure(400, '{"message":"call_token_not_available_for_booking_state"}')).toBe("ended");
    expect(callTokenFailure(400, '{"message":"call_token_only_available_for_video_booking"}')).toBe("unavailable");
    expect(callTokenFailure(500, "")).toBe("unavailable");
  });
});

describe("the call room client (source, there is no DOM harness in this repo)", () => {
  const src = fs.readFileSync(path.join(__dirname, "../components-next/video-room-client.tsx"), "utf8");
  it("camera and microphone are requested separately and a refusal is shown", () => {
    expect(src).not.toContain("enableCameraAndMicrophone");
    expect(src).toContain("setMicrophoneEnabled(true).then(() => true, () => false)");
    expect(src).toContain("setCameraEnabled(true).then(() => true, () => false)");
    expect(src).toContain("data-call-denied=\"microphone\"");
    expect(src).toContain("data-call-denied=\"camera\"");
  });
  it("a connection failure shows an error with a retry, not 'call ended'", () => {
    expect(src).toContain("setState(\"failed\")");
    expect(src).toContain("data-call-failed");
    expect(src).toContain("setAttempt((n) => n + 1)");
  });
  it("blocked autoplay shows a button that starts the audio", () => {
    expect(src).toContain("RoomEvent.AudioPlaybackStatusChanged");
    expect(src).toContain("room.canPlaybackAudio");
    expect(src).toContain("roomRef.current?.startAudio()");
  });
  it("leaving ends the session and the poor-link detector is the time-based one", () => {
    expect(src).toContain("void endCallSession(fetch, endSessionId);");
    expect(src).toContain("poorLinkClock(");
    expect(src).not.toContain("poorConnectionTracker");
  });
  it("room/[id] passes the session id; the booking page maps the refusal; every label exists in six languages", () => {
    expect(fs.readFileSync(path.join(__dirname, "../app/[locale]/room/[id]/page.tsx"), "utf8")).toContain("endSessionId={id}");
    expect(fs.readFileSync(path.join(__dirname, "../app/[locale]/consultations/video-call/page.tsx"), "utf8")).toContain("callTokenFailure(r.status");
    for (const lang of ["en", "ar", "ur", "hi", "bn", "fil"]) {
      const m = JSON.parse(fs.readFileSync(path.join(__dirname, `../messages/${lang}.json`), "utf8")).ConsultWeb;
      for (const key of ["callMicDenied", "callCamDenied", "callConnectFailed", "callRetry", "callEnableSound"]) expect(typeof m[key] === "string" && m[key].length > 0, `${lang}.${key}`).toBe(true);
    }
  });
});
