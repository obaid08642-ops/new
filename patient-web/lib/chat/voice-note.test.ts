import { describe, expect, it } from "vitest";
import { extractChatMessageSummaries } from "@/lib/api/chat";
import { parseThreadPermissions } from "./permissions";
import { buildVoiceMessage, encodeWav, formatClock, MAX_VOICE_SECONDS, parseVoiceMessage, pickRecorderMime, safeMediaUrl, uploadNameFor, voiceNoteAllowed, voiceReducer, type VoiceEvent, type VoiceState } from "./voice-note";

const run = (events: VoiceEvent[], from: VoiceState = { phase: "idle" }) => events.reduce(voiceReducer, from);
const perms = (over: Record<string, unknown>) => parseThreadPermissions({ can_chat: true, can_call: true, can_upload: true, can_voice: true, online: true, status_code: "active", ...over });

describe("voice recorder state machine", () => {
  it("records, previews and sends", () => {
    expect(run([{ type: "start" }, { type: "granted" }, { type: "tick", seconds: 12.9 }])).toEqual({ phase: "recording", seconds: 12 });
    expect(run([{ type: "start" }, { type: "granted" }, { type: "tick", seconds: 7 }, { type: "stop" }])).toEqual({ phase: "preview", seconds: 7 });
    expect(run([{ type: "start" }, { type: "granted" }, { type: "tick", seconds: 7 }, { type: "stop" }, { type: "send" }, { type: "sent" }])).toEqual({ phase: "idle" });
  });
  it("caps the timer and gives a stopped empty take one second", () => {
    expect(run([{ type: "start" }, { type: "granted" }, { type: "tick", seconds: 9999 }])).toEqual({ phase: "recording", seconds: MAX_VOICE_SECONDS });
    expect(run([{ type: "start" }, { type: "granted" }, { type: "stop" }])).toEqual({ phase: "preview", seconds: 1 });
  });
  it("cancel drops a recording or a preview but never an upload in flight", () => {
    expect(run([{ type: "start" }, { type: "granted" }, { type: "cancel" }])).toEqual({ phase: "idle" });
    expect(run([{ type: "cancel" }], { phase: "preview", seconds: 3 })).toEqual({ phase: "idle" });
    expect(run([{ type: "cancel" }], { phase: "sending", seconds: 3 })).toEqual({ phase: "sending", seconds: 3 });
  });
  it("permission denied returns to a retryable start", () => {
    const denied = run([{ type: "start" }, { type: "fail", kind: "denied" }]);
    expect(denied).toEqual({ phase: "error", kind: "denied" });
    expect(run([{ type: "start" }], denied)).toEqual({ phase: "requesting" });
    expect(run([{ type: "retry" }], denied)).toEqual({ phase: "idle" });
  });
  it("a failed upload keeps the recording for a retry", () => {
    const failed = run([{ type: "send" }, { type: "fail", kind: "uploadFailed" }], { phase: "preview", seconds: 9 });
    expect(failed).toEqual({ phase: "error", kind: "uploadFailed", seconds: 9 });
    expect(run([{ type: "retry" }], failed)).toEqual({ phase: "preview", seconds: 9 });
    expect(run([{ type: "send" }], failed)).toEqual({ phase: "sending", seconds: 9 });
  });
  it("ignores events that do not fit", () => {
    expect(run([{ type: "stop" }, { type: "sent" }, { type: "granted" }, { type: "tick", seconds: 3 }])).toEqual({ phase: "idle" });
  });
});

describe("voice note message build and parse", () => {
  it("builds the body the app sends", () => {
    expect(buildVoiceMessage({ mediaId: "m1", name: "voice.wav", mime: "audio/wav", size: 4096, seconds: 6.4, clientMessageId: "k" })).toEqual({
      body: "", type: "voice", media_ids: ["m1"], attachment_mime: "audio/wav", attachment_name: "voice.wav", attachment_size: 4096, duration_seconds: 6, client_message_id: "k",
    });
    expect(buildVoiceMessage({ mediaId: "m1", name: "a", mime: "audio/mp4", size: 0, seconds: 0 })).not.toHaveProperty("attachment_size");
    expect(buildVoiceMessage({ mediaId: "m1", name: "a", mime: "audio/mp4", size: 1, seconds: Number.NaN }).duration_seconds).toBe(1);
  });
  it("parses received voice messages of either side and ignores the rest", () => {
    expect(parseVoiceMessage({ type: "voice", media_ids: ["abc-1"], duration_seconds: 12.4 })).toEqual({ mediaId: "abc-1", durationSeconds: 12 });
    expect(parseVoiceMessage({ type: "voice", media_ids: ["abc-1"] })).toEqual({ mediaId: "abc-1" });
    expect(parseVoiceMessage({ type: "voice", media_ids: [] })).toBeNull();
    expect(parseVoiceMessage({ type: "voice", media_ids: ["../x"] })).toBeNull();
    expect(parseVoiceMessage({ type: "voice", media_ids: ["a"], is_deleted: true })).toBeNull();
    expect(parseVoiceMessage({ type: "image", media_ids: ["a"] })).toBeNull();
    expect(parseVoiceMessage(null)).toBeNull();
  });
  it("the thread list carries the voice attachment", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const [m] = extractChatMessageSummaries({ messages: [{ id, sender_role: "provider", type: "voice", media_ids: ["m9"], duration_seconds: 30, attachment_name: "voice.m4a" }] });
    expect(m.voice).toEqual({ mediaId: "m9", durationSeconds: 30 });
    expect(m.text).toBeUndefined();
  });
});

describe("gating by consultation type (the server's can_voice)", () => {
  it("online consultation: allowed", () => expect(voiceNoteAllowed(perms({}))).toBe(true));
  it("online follow-up window: allowed", () => expect(voiceNoteAllowed(perms({ status_code: "follow_up", remaining_hours: 5 }))).toBe(true));
  it("in-clinic and home-visit threads (can_voice false): not allowed", () => expect(voiceNoteAllowed(perms({ can_voice: false, online: false, can_call: false }))).toBe(false));
  it("read-only, closed or unknown rules: not allowed", () => {
    expect(voiceNoteAllowed(perms({ read_only: true }))).toBe(false);
    expect(voiceNoteAllowed(perms({ can_chat: false }))).toBe(false);
    expect(voiceNoteAllowed(null)).toBe(false);
  });
});

describe("helpers", () => {
  it("formats the clock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65.7)).toBe("1:05");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
  it("picks a recorder format, mp4 first", () => {
    expect(pickRecorderMime((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickRecorderMime(() => true)).toBe("audio/mp4");
    expect(pickRecorderMime(() => false)).toBeNull();
  });
  it("names the upload by what the media store accepts", () => {
    expect(uploadNameFor("audio/mp4", 5)).toEqual({ name: "voice-5.m4a", mime: "audio/mp4" });
    expect(uploadNameFor("audio/wav", 5)).toEqual({ name: "voice-5.wav", mime: "audio/wav" });
  });
  it("writes a valid 16-bit mono WAV", () => {
    const wav = new DataView(encodeWav(new Float32Array([0, 1, -1, 2]), 16000));
    expect(wav.byteLength).toBe(44 + 8);
    expect(String.fromCharCode(wav.getUint8(0), wav.getUint8(1), wav.getUint8(2), wav.getUint8(3))).toBe("RIFF");
    expect(wav.getUint32(24, true)).toBe(16000);
    expect(wav.getInt16(46, true)).toBe(0x7fff);
    expect(wav.getInt16(48, true)).toBe(-0x8000);
    expect(wav.getInt16(50, true)).toBe(0x7fff);
  });
  it("accepts only https download links", () => {
    expect(safeMediaUrl("https://cdn.nabd.plus/a.m4a?x=1")).toContain("https://");
    expect(safeMediaUrl("http://x/a")).toBeNull();
    expect(safeMediaUrl("javascript:1")).toBeNull();
    expect(safeMediaUrl(3)).toBeNull();
  });
});
