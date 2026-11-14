/**
 * P14.22: how the web call room behaves on a bad network, kept apart from React so it can be tested with a stand-in room.
 *  - the same connection settings as patient-app and provider-app (adaptive stream, dynacast, simulcast 180p/360p,
 *    speech audio with DTX);
 *  - two "poor" connection reports in a row (LiveKit sends about one every 2 s) switch the call to audio only;
 *  - a call that ends without the patient leaving is "dropped" (the page then offers the appointment's chat).
 */
import type { AudioPresets as LkAudioPresets, VideoPresets as LkVideoPresets } from "livekit-client";

export const POOR_REPORTS_FOR_AUDIO_ONLY = 2;
/** A call that has not come back within this long after the connection was lost is over ("dropped"); until then it is only "reconnecting". */
export const RECONNECT_DEADLINE_MS = 30_000;

export type QualityLevel = "excellent" | "good" | "poor" | "lost" | "unknown";
export const qualityLevel = (q: unknown): QualityLevel => (q === "excellent" || q === "good" || q === "poor" || q === "lost" ? q : "unknown");


type Presets = { VideoPresets: typeof LkVideoPresets; AudioPresets: typeof LkAudioPresets };

/**
 * Which codec the browser publishes video with. VP8 plays in every browser and in the apps (libwebrtc), supports simulcast everywhere and
 * is what the other side decodes; H.264 is the fallback for a browser whose sender lacks VP8 (some locked-down or very old WebViews).
 * `capabilities` is `RTCRtpSender.getCapabilities('video')?.codecs`.
 */
export function pickVideoCodec(capabilities: { mimeType: string }[] | undefined | null): 'vp8' | 'h264' {
  const mimes = (capabilities ?? []).map((c) => c.mimeType.toLowerCase());
  if (mimes.length === 0 || mimes.includes('video/vp8')) return 'vp8';
  return mimes.includes('video/h264') ? 'h264' : 'vp8';
}

export function callRoomOptions({ VideoPresets, AudioPresets }: Presets, videoCodec: 'vp8' | 'h264' = 'vp8') {
  return {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    publishDefaults: {
      videoCodec,
      simulcast: true,
      videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
      videoEncoding: { maxBitrate: 1_700_000 },
      audioPreset: AudioPresets.speech,
      dtx: true,
    },
  };
}

/** Counts consecutive poor reports for the local participant; true once the call should go audio only. */
export function poorConnectionTracker(threshold = POOR_REPORTS_FOR_AUDIO_ONLY) {
  let poor = 0;
  return {
    report(quality: string, poorValue: string): boolean {
      poor = quality === poorValue ? poor + 1 : 0;
      return poor >= threshold;
    },
    reset() { poor = 0; },
  };
}

export function stateAfterDisconnect(reason: number | undefined, clientInitiated: number): "ended" | "dropped" {
  return reason === undefined || reason === clientInitiated ? "ended" : "dropped";
}

type MiniRoom = {
  localParticipant: { setCameraEnabled(on: boolean): Promise<unknown>; isCameraEnabled: boolean };
  remoteParticipants: Map<string, { videoTrackPublications: Map<string, { setSubscribed(on: boolean): void }> }>;
};

/** Video off both ways (camera unpublished, the other side's video unsubscribed) or back on; sound is never touched. */
export async function setVideo(room: MiniRoom, on: boolean): Promise<void> {
  room.remoteParticipants.forEach((p) => p.videoTrackPublications.forEach((pub) => pub.setSubscribed(on)));
  await room.localParticipant.setCameraEnabled(on).catch(() => undefined);
}

/**
 * The clock of a lost connection: started by the first "reconnecting" event (a second one does not restart it), stopped when the call is
 * back or over, and it fires `onExpire` once when the call has not come back within `ms`.
 */
export function reconnectClock(onExpire: () => void, ms = RECONNECT_DEADLINE_MS) {
  let id: ReturnType<typeof setTimeout> | null = null;
  return {
    start() {
      if (id !== null) return;
      id = setTimeout(() => { id = null; onExpire(); }, ms);
    },
    stop() { if (id !== null) { clearTimeout(id); id = null; } },
    running: () => id !== null,
  };
}

/**
 * How long a poor connection must last before the call drops to sound only. LiveKit reports a quality change only when it changes
 * ("poor" is not repeated while it stays poor), so counting consecutive poor reports can never reach two; the time spent poor is what
 * tells a bad link from a blip.
 */
export const POOR_LINK_MS = 8_000;

/** Fires `onPoorLong` once if the link stays poor for `ms`; any better report before that cancels it. */
export function poorLinkClock(onPoorLong: () => void, ms = POOR_LINK_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return {
    /** A quality report for my side: poor starts the clock (a second poor does not restart it), anything else stops it. */
    report(isPoor: boolean) {
      if (!isPoor) { stop(); return; }
      if (timer) return;
      timer = setTimeout(() => { timer = null; onPoorLong(); }, ms);
    },
    stop,
  };
}
