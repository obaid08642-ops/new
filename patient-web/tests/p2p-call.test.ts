import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { P2PCall, isWeakSample, type PeerLike } from "@/lib/consult/p2p-call";

function fakePeer(stats: Array<Record<string, unknown>> = []) {
  const pc = {
    connectionState: "new", iceConnectionState: "new",
    createOffer: vi.fn(async () => ({ type: "offer" as const, sdp: "o" })),
    createAnswer: vi.fn(async () => ({ type: "answer" as const, sdp: "a" })),
    setLocalDescription: vi.fn(async () => undefined),
    setRemoteDescription: vi.fn(async () => undefined),
    addIceCandidate: vi.fn(async () => undefined),
    addTrack: vi.fn(),
    getStats: vi.fn(async () => new Map(stats.map((s) => [String(s.id), s]))),
    close: vi.fn(),
    onicecandidate: null, ontrack: null, oniceconnectionstatechange: null,
  } as unknown as PeerLike & { iceConnectionState: string };
  return pc;
}

function setup(stats: Array<Record<string, unknown>> = []) {
  const pc = fakePeer(stats);
  const sig = { sendOffer: vi.fn(), sendAnswer: vi.fn(), sendCandidate: vi.fn() };
  const h = { onRemoteStream: vi.fn(), onConnected: vi.fn(), onFallback: vi.fn(), onAudioOnly: vi.fn() };
  const call = new P2PCall(() => pc, sig, h, 5000);
  return { pc, sig, h, call };
}

describe("P2PCall", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("the caller offers, the callee answers, candidates wait for the remote description", async () => {
    const a = setup();
    await a.call.start();
    expect(a.sig.sendOffer).toHaveBeenCalledWith({ type: "offer", sdp: "o" });

    const b = setup();
    await b.call.onCandidate({ c: 1 });
    expect(b.pc.addIceCandidate).not.toHaveBeenCalled();
    await b.call.onOffer({ type: "offer", sdp: "o" });
    expect(b.pc.addIceCandidate).toHaveBeenCalledTimes(1);
    expect(b.sig.sendAnswer).toHaveBeenCalledWith({ type: "answer", sdp: "a" });
    await b.call.onCandidate({ c: 2 });
    expect(b.pc.addIceCandidate).toHaveBeenCalledTimes(2);
  });

  it("falls back to LiveKit once when ICE fails", async () => {
    const { pc, h } = setup();
    (pc as unknown as { iceConnectionState: string }).iceConnectionState = "failed";
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(h.onFallback).toHaveBeenCalledTimes(1);
    expect(h.onFallback).toHaveBeenCalledWith("ice_failed");
    expect(pc.close).toHaveBeenCalled();
  });

  it("falls back on timeout when nothing connects", async () => {
    const { h } = setup();
    await vi.advanceTimersByTimeAsync(5001);
    expect(h.onFallback).toHaveBeenCalledWith("timeout");
  });

  it("reports a direct path, or a relay path when the selected pair uses TURN", async () => {
    const direct = setup([
      { id: "p", type: "candidate-pair", nominated: true, localCandidateId: "l", remoteCandidateId: "r" },
      { id: "l", type: "local-candidate", candidateType: "srflx" }, { id: "r", type: "remote-candidate", candidateType: "host" },
    ]);
    (direct.pc as unknown as { iceConnectionState: string }).iceConnectionState = "connected";
    direct.pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(direct.h.onConnected).toHaveBeenCalledWith("direct");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(direct.h.onFallback).not.toHaveBeenCalled();

    const relay = setup([
      { id: "p", type: "candidate-pair", nominated: true, localCandidateId: "l", remoteCandidateId: "r" },
      { id: "l", type: "local-candidate", candidateType: "relay" }, { id: "r", type: "remote-candidate", candidateType: "host" },
    ]);
    (relay.pc as unknown as { iceConnectionState: string }).iceConnectionState = "completed";
    relay.pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(relay.h.onConnected).toHaveBeenCalledWith("relay");
  });

  it("two weak samples in a row turn the video off; a good sample resets the count", () => {
    const { call, h } = setup();
    call.sample(0.2, 100); call.sample(0, 100); call.sample(0.2, 100);
    expect(h.onAudioOnly).not.toHaveBeenCalled();
    call.sample(0, 900);
    expect(h.onAudioOnly).toHaveBeenCalledTimes(1);
    expect(isWeakSample(0.01, 100)).toBe(false);
  });
});
