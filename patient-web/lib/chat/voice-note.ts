import type { ThreadPermissions } from "./permissions";

/**
 * Voice notes in the doctor's thread (items 388 / 799), the web side of patient-app/src/components/consult/VoiceNoteButton.tsx.
 *
 * - Shown only where the server says `can_voice` (an online consultation, rules in backend consultation-window.ts) and the
 *   thread is not read-only; the web never decides by booking type itself.
 * - The file goes through POST /media/upload (purpose chat, thread_id), then POST /chat/threads/:id/messages with
 *   type "voice", media_ids, attachment_* and duration_seconds, like the app. The media store reads the file's first bytes
 *   and knows WAV, MP3 and MP4 audio only, so a browser recording in WebM/Ogg (Chrome, Firefox) is converted to WAV here;
 *   Safari's MP4 audio is sent as is. Limit: 15 MB per file (backend media.controller), so a recording stops at 5 minutes
 *   (WAV mono 16 kHz is about 9.6 MB).
 */
export const MAX_VOICE_SECONDS = 300;
export const WAV_SAMPLE_RATE = 16000;
export const MAX_VOICE_BYTES = 15 * 1024 * 1024;

export function voiceNoteAllowed(p: ThreadPermissions | null): boolean {
  return Boolean(p && p.canVoice && p.canChat && !p.readOnly);
}

export type VoiceErrorKind = "denied" | "unsupported" | "recordFailed" | "uploadFailed" | "forbidden";

export type VoiceState =
  | { phase: "idle" }
  | { phase: "requesting" }
  | { phase: "recording"; seconds: number }
  | { phase: "preview"; seconds: number }
  | { phase: "sending"; seconds: number }
  | { phase: "error"; kind: VoiceErrorKind; seconds?: number };

export type VoiceEvent =
  | { type: "start" }
  | { type: "granted" }
  | { type: "tick"; seconds: number }
  | { type: "stop" }
  | { type: "cancel" }
  | { type: "send" }
  | { type: "sent" }
  | { type: "fail"; kind: VoiceErrorKind }
  | { type: "retry" };

/** The recorder's whole life as a pure reducer; an event that does not fit the state leaves it unchanged. */
export function voiceReducer(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case "start":
      return state.phase === "idle" || (state.phase === "error" && state.seconds === undefined) ? { phase: "requesting" } : state;
    case "granted":
      return state.phase === "requesting" ? { phase: "recording", seconds: 0 } : state;
    case "tick":
      return state.phase === "recording" ? { phase: "recording", seconds: Math.min(MAX_VOICE_SECONDS, Math.max(0, Math.floor(event.seconds))) } : state;
    case "stop":
      return state.phase === "recording" ? { phase: "preview", seconds: Math.max(1, state.seconds) } : state;
    case "cancel":
      return state.phase === "sending" ? state : { phase: "idle" };
    case "send":
      return state.phase === "preview" || (state.phase === "error" && state.seconds !== undefined) ? { phase: "sending", seconds: state.seconds ?? 1 } : state;
    case "sent":
      return state.phase === "sending" ? { phase: "idle" } : state;
    case "fail":
      if (state.phase === "sending") return { phase: "error", kind: event.kind, seconds: state.seconds };
      return state.phase === "idle" || state.phase === "requesting" || state.phase === "recording" ? { phase: "error", kind: event.kind } : state;
    case "retry":
      return state.phase === "error" ? (state.seconds !== undefined ? { phase: "preview", seconds: state.seconds } : { phase: "idle" }) : state;
  }
}

/** `m:ss` for a length in seconds. */
export function formatClock(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The best format this browser can record, or null when MediaRecorder cannot record audio at all. */
export function pickRecorderMime(isSupported: (type: string) => boolean): string | null {
  for (const type of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) if (isSupported(type)) return type;
  return null;
}

/** What the media store needs: audio/mp4 goes up as .m4a, everything else was converted to WAV. */
export function uploadNameFor(mime: string, now: number): { name: string; mime: string } {
  return mime.startsWith("audio/mp4") ? { name: `voice-${now}.m4a`, mime: "audio/mp4" } : { name: `voice-${now}.wav`, mime: "audio/wav" };
}

/** 16-bit mono PCM WAV from samples in [-1, 1]. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/** The POST /chat/threads/:id/messages body of a sent voice note (the app's `post({ type: 'voice', ... })`). */
export function buildVoiceMessage(input: { mediaId: string; name: string; mime: string; size: number; seconds: number; clientMessageId?: string }) {
  const seconds = Number.isFinite(input.seconds) ? Math.max(1, Math.round(input.seconds)) : 1;
  return {
    body: "",
    type: "voice" as const,
    media_ids: [input.mediaId],
    attachment_mime: input.mime,
    attachment_name: input.name,
    ...(input.size > 0 ? { attachment_size: input.size } : {}),
    duration_seconds: seconds,
    ...(input.clientMessageId ? { client_message_id: input.clientMessageId } : {}),
  };
}

export type VoiceAttachment = { mediaId: string; durationSeconds?: number };

/** A received voice message (either side): its media id and length; null for any other message or a deleted one. */
export function parseVoiceMessage(record: Record<string, unknown> | null): VoiceAttachment | null {
  if (!record || record.type !== "voice" || record.is_deleted === true) return null;
  const ids = Array.isArray(record.media_ids) ? record.media_ids : [];
  const mediaId = ids.find((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id));
  if (!mediaId) return null;
  const d = record.duration_seconds;
  return { mediaId, ...(typeof d === "number" && Number.isFinite(d) && d > 0 ? { durationSeconds: Math.round(d) } : {}) };
}

/** A media-store download link may only be an https address. */
export function safeMediaUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
