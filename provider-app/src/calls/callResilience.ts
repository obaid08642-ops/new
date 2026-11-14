// Identical to patient-app/src/calls/callResilience.ts (a test keeps the two files equal).
/**
 * How a call behaves on a bad or changing network, kept apart from React so it can be tested with a stand-in room (the web call room does
 * the same in patient-web/lib/consult/call-resilience.ts; this is the native app's copy).
 *  - one set of connection settings (adaptive stream, dynacast, simulcast 180p/360p, speech audio with DTX);
 *  - a lost connection (Wi-Fi <-> 4G/5G switch, a lift, a tunnel) shows "reconnecting" while LiveKit restarts ICE and resumes the SAME call;
 *    only when that has not worked in RECONNECT_DEADLINE_MS is the call "dropped" (and the room closed);
 *  - two "poor" quality reports in a row (about one per 2 s) switch the call to audio only (camera off, remote video unsubscribed), with a way back;
 *  - the server's advice (/calls/:id/join: audio_only because of a weak link or server pressure) starts the call audio only;
 *  - per-side connection quality, for an indicator on each side.
 */

export const POOR_REPORTS_FOR_AUDIO_ONLY = 2;
export const RECONNECT_DEADLINE_MS = 30_000;

export type CallPhase = 'connecting' | 'live' | 'reconnecting' | 'ended' | 'dropped';
export type QualityLevel = 'excellent' | 'good' | 'poor' | 'lost' | 'unknown';
export type AudioOnlyReason = 'weak_link' | 'server_pressure';

/** The room options the three clients share. `presets` come from livekit-client so this file imports nothing native. */
export function callRoomOptions(presets: { VideoPresets: any; AudioPresets: any }) {
  const { VideoPresets, AudioPresets } = presets;
  return {
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    publishDefaults: {
      videoCodec: 'vp8' as const, // plays on every browser and phone on the other side (web falls back to H.264 only without VP8)
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

export function qualityLevel(q: unknown): QualityLevel {
  return q === 'excellent' || q === 'good' || q === 'poor' || q === 'lost' ? q : 'unknown';
}

/** 0-3 bars for the indicator. */
export function qualityBars(q: QualityLevel): number {
  return q === 'excellent' ? 3 : q === 'good' ? 2 : q === 'poor' ? 1 : 0;
}

/** A call that ends without the user leaving (network, server) is "dropped"; a hang-up by the user is "ended". */
export function stateAfterDisconnect(reason: number | undefined, clientInitiated: number): 'ended' | 'dropped' {
  return reason === undefined || reason === clientInitiated ? 'ended' : 'dropped';
}

type VideoRoom = {
  localParticipant: { setCameraEnabled(on: boolean): Promise<unknown> };
  remoteParticipants: Map<string, { videoTrackPublications: Map<string, { setSubscribed(on: boolean): void }> }>;
};

/** Video off both ways (camera unpublished, the other side's video unsubscribed) or back on; the sound is never touched. */
export async function setVideo(room: VideoRoom, on: boolean): Promise<void> {
  room.remoteParticipants.forEach((p) => p.videoTrackPublications.forEach((pub) => pub.setSubscribed(on)));
  await room.localParticipant.setCameraEnabled(on).catch(() => undefined);
}

type Evented = VideoRoom & {
  localParticipant: VideoRoom['localParticipant'] & { identity: string };
  on(event: string, cb: (...args: any[]) => void): unknown;
  off?(event: string, cb: (...args: any[]) => void): unknown;
  disconnect(): unknown;
};
type Events = { RoomEvent: Record<string, string>; ConnectionQuality: { Poor: string }; DisconnectReason: { CLIENT_INITIATED: number } };
type Timers = { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void };

export interface ResilienceCallbacks {
  onPhase(phase: CallPhase): void;
  onAudioOnly(on: boolean, reason: AudioOnlyReason | null): void;
  onQuality(identity: string, level: QualityLevel, local: boolean): void;
}

/**
 * Wires a Room to the behaviour above. Returns `applyStartAdvice()` (the server's audio-only advice from /calls/:id/join),
 * `tryVideo()` (the way back from audio only) and `dispose()`.
 */
export function bindCallResilience(
  room: Evented,
  ev: Events,
  cb: ResilienceCallbacks,
  opts: { deadlineMs?: number; startAudioOnly?: AudioOnlyReason | null; timers?: Timers } = {},
) {
  const timers: Timers = opts.timers ?? { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) };
  const deadline = opts.deadlineMs ?? RECONNECT_DEADLINE_MS;
  const poor = poorConnectionTracker();
  let audioOnly = false;
  let watch: unknown = null;
  let closed = false;
  const R = ev.RoomEvent;

  const stopWatch = () => { if (watch !== null) { timers.clear(watch); watch = null; } };
  const startWatch = () => {
    if (watch !== null || closed) return;
    watch = timers.set(() => {
      watch = null;
      if (closed) return;
      closed = true;
      cb.onPhase('dropped');
      void room.disconnect();
    }, deadline);
  };
  const goAudioOnly = async (reason: AudioOnlyReason) => {
    if (audioOnly) return;
    audioOnly = true;
    cb.onAudioOnly(true, reason);
    await setVideo(room, false);
  };

  const handlers: Array<[string, (...args: any[]) => void]> = [
    [R.Reconnecting, () => { if (!closed) { cb.onPhase('reconnecting'); startWatch(); } }],
    [R.SignalReconnecting, () => { if (!closed) { cb.onPhase('reconnecting'); startWatch(); } }],
    [R.Reconnected, () => { stopWatch(); if (!closed) cb.onPhase('live'); }],
    [R.ConnectionQualityChanged, (quality: string, participant: { identity: string }) => {
      const local = participant?.identity === room.localParticipant.identity;
      cb.onQuality(participant?.identity ?? '', qualityLevel(quality), local);
      if (local && poor.report(quality, ev.ConnectionQuality.Poor)) void goAudioOnly('weak_link');
    }],
    [R.Disconnected, (reason?: number) => {
      stopWatch();
      if (closed) return; // the deadline already reported "dropped"
      closed = true;
      cb.onPhase(stateAfterDisconnect(reason, ev.DisconnectReason.CLIENT_INITIATED));
    }],
  ];
  handlers.forEach(([name, fn]) => room.on(name, fn));

  return {
    async applyStartAdvice() { if (opts.startAudioOnly) await goAudioOnly(opts.startAudioOnly); },
    async tryVideo() {
      poor.reset();
      audioOnly = false;
      cb.onAudioOnly(false, null);
      await setVideo(room, true);
    },
    isAudioOnly: () => audioOnly,
    dispose() {
      closed = true;
      stopWatch();
      handlers.forEach(([name, fn]) => room.off?.(name, fn));
    },
  };
}
