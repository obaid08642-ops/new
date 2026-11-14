/**
 * Calls at scale: the peer-to-peer engine for a 1:1 consultation (`transport: "p2p"` from POST /calls/:id/join, only when the
 * server runs with CALLS_P2P_ENABLED). The backend authorizes and relays the signalling (call:sdp_offer / call:sdp_answer /
 * call:ice_candidate over the realtime gateway); the media goes browser to browser, or through coturn when the direct path
 * fails. Written against small interfaces so it is tested with stand-ins, and so patient-app and provider-app can follow it.
 *  - the caller makes the offer, the callee answers; ICE candidates arriving before the remote description are queued;
 *  - no connection within `connectTimeoutMs`, or ICE "failed", calls `onFallback` once (the page then POSTs /calls/:id/fallback
 *    and joins LiveKit, keeping the same room);
 *  - once connected, the selected candidate pair says whether the media goes direct or through TURN (reported to the server);
 *  - a weak link (loss >= 10 %, round trip >= 600 ms) twice in a row, or the server's advice, turns the video off, sound kept.
 */
export interface PeerLike {
  connectionState: string;
  iceConnectionState: string;
  createOffer(): Promise<{ type: "offer"; sdp?: string }>;
  createAnswer(): Promise<{ type: "answer"; sdp?: string }>;
  setLocalDescription(d: { type: string; sdp?: string }): Promise<void>;
  setRemoteDescription(d: { type: string; sdp?: string }): Promise<void>;
  addIceCandidate(c: unknown): Promise<void>;
  addTrack(track: unknown, stream: unknown): unknown;
  getStats(): Promise<Map<string, Record<string, unknown>> | { forEach(cb: (v: Record<string, unknown>) => void): void }>;
  close(): void;
  onicecandidate: ((e: { candidate: unknown }) => void) | null;
  ontrack: ((e: { streams: unknown[] }) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
}

export interface Signalling {
  sendOffer(sdp: { type: string; sdp?: string }): void;
  sendAnswer(sdp: { type: string; sdp?: string }): void;
  sendCandidate(candidate: unknown): void;
}

export type FallbackReason = "ice_failed" | "timeout" | "no_relay";
export type MediaPath = "direct" | "relay";

export interface P2PHandlers {
  onRemoteStream(stream: unknown): void;
  onConnected(path: MediaPath): void;
  onFallback(reason: FallbackReason): void;
  onAudioOnly(): void;
}

export const WEAK_LOSS = 0.1;
export const WEAK_RTT_MS = 600;
export const WEAK_SAMPLES_FOR_AUDIO_ONLY = 2;

export function isWeakSample(loss: number, rttMs: number): boolean {
  return (Number.isFinite(loss) && loss >= WEAK_LOSS) || (Number.isFinite(rttMs) && rttMs >= WEAK_RTT_MS);
}

function eachStat(stats: Awaited<ReturnType<PeerLike["getStats"]>>, cb: (v: Record<string, unknown>) => void) {
  (stats as { forEach(f: (v: Record<string, unknown>) => void): void }).forEach(cb);
}

export class P2PCall {
  private pc: PeerLike;
  private queued: unknown[] = [];
  private haveRemote = false;
  private settled = false;
  private weak = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    createPeer: () => PeerLike,
    private readonly signalling: Signalling,
    private readonly handlers: P2PHandlers,
    private readonly connectTimeoutMs = 12_000,
  ) {
    this.pc = createPeer();
    // toJSON(): an RTCIceCandidate is a platform object that does not survive structured cloning or every socket serializer.
    this.pc.onicecandidate = (e) => {
      const c = e.candidate as { toJSON?: () => unknown } | null;
      if (c) this.signalling.sendCandidate(typeof c.toJSON === "function" ? c.toJSON() : c);
    };
    this.pc.ontrack = (e) => { if (e.streams[0]) this.handlers.onRemoteStream(e.streams[0]); };
    this.pc.oniceconnectionstatechange = () => void this.onIceState();
    this.timer = setTimeout(() => this.fail("timeout"), this.connectTimeoutMs);
  }

  addLocalTracks(tracks: unknown[], stream: unknown) { tracks.forEach((t) => this.pc.addTrack(t, stream)); }

  async start(): Promise<void> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signalling.sendOffer(offer);
  }

  async onOffer(offer: { type: string; sdp?: string }): Promise<void> {
    await this.pc.setRemoteDescription(offer);
    this.haveRemote = true;
    await this.flush();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signalling.sendAnswer(answer);
  }

  async onAnswer(answer: { type: string; sdp?: string }): Promise<void> {
    await this.pc.setRemoteDescription(answer);
    this.haveRemote = true;
    await this.flush();
  }

  async onCandidate(candidate: unknown): Promise<void> {
    if (!this.haveRemote) { this.queued.push(candidate); return; }
    await this.pc.addIceCandidate(candidate).catch(() => undefined);
  }

  private async flush() {
    const pending = this.queued.splice(0);
    for (const c of pending) await this.pc.addIceCandidate(c).catch(() => undefined);
  }

  private fail(reason: FallbackReason) {
    if (this.settled) return;
    this.settled = true;
    if (this.timer) clearTimeout(this.timer);
    this.pc.close();
    this.handlers.onFallback(reason);
  }

  private async onIceState() {
    const state = this.pc.iceConnectionState;
    if (state === "failed") { this.fail("ice_failed"); return; }
    if ((state === "connected" || state === "completed") && !this.settled) {
      this.settled = true;
      if (this.timer) clearTimeout(this.timer);
      this.handlers.onConnected(await this.mediaPath());
    }
  }

  /** The selected candidate pair: a relay candidate on either side means the media goes through TURN. */
  async mediaPath(): Promise<MediaPath> {
    const stats = await this.pc.getStats();
    const byId = new Map<string, Record<string, unknown>>();
    let selected: Record<string, unknown> | undefined;
    eachStat(stats, (v) => {
      byId.set(String(v.id), v);
      if (v.type === "candidate-pair" && (v.nominated === true || v.state === "succeeded") && v.selected !== false) selected = selected ?? v;
    });
    const sel = selected as Record<string, unknown> | undefined;
    const local = sel ? byId.get(String(sel.localCandidateId)) : undefined;
    const remote = sel ? byId.get(String(sel.remoteCandidateId)) : undefined;
    return local?.candidateType === "relay" || remote?.candidateType === "relay" ? "relay" : "direct";
  }

  /** Called every couple of seconds with the latest loss and round trip; the video goes off after two weak samples in a row. */
  sample(loss: number, rttMs: number) {
    this.weak = isWeakSample(loss, rttMs) ? this.weak + 1 : 0;
    if (this.weak === WEAK_SAMPLES_FOR_AUDIO_ONLY) this.handlers.onAudioOnly();
  }

  close() { this.settled = true; if (this.timer) clearTimeout(this.timer); this.pc.close(); }
}
