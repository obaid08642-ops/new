import { EventEmitter } from 'node:events';
import { RECONNECT_DEADLINE_MS, bindCallResilience, callRoomOptions, poorConnectionTracker, qualityBars, qualityLevel, stateAfterDisconnect, type CallPhase } from '../src/calls/callResilience';

const RoomEvent = { Reconnecting: 'reconnecting', SignalReconnecting: 'signalReconnecting', Reconnected: 'reconnected', Disconnected: 'disconnected', ConnectionQualityChanged: 'connectionQualityChanged' };
const ev = { RoomEvent, ConnectionQuality: { Poor: 'poor' }, DisconnectReason: { CLIENT_INITIATED: 1 } };

function standIn() {
  const bus = new EventEmitter();
  const subs: Array<{ setSubscribed: jest.Mock }> = [{ setSubscribed: jest.fn() }];
  const room = {
    localParticipant: { identity: 'me', setCameraEnabled: jest.fn(async () => undefined) },
    remoteParticipants: new Map([['doc', { videoTrackPublications: new Map([['v', subs[0]]]) }]]),
    on: (e: string, f: (...a: any[]) => void) => bus.on(e, f),
    off: (e: string, f: (...a: any[]) => void) => bus.off(e, f),
    disconnect: jest.fn(),
  };
  return { room, bus, sub: subs[0] };
}
function bind(startAudioOnly: 'weak_link' | 'server_pressure' | null = null) {
  jest.useFakeTimers();
  const s = standIn();
  const phases: CallPhase[] = [];
  const audio: Array<[boolean, string | null]> = [];
  const quality: Array<[string, string, boolean]> = [];
  const ctl = bindCallResilience(s.room as any, ev, {
    onPhase: (p) => phases.push(p),
    onAudioOnly: (on, r) => audio.push([on, r]),
    onQuality: (id, l, local) => quality.push([id, l, local]),
  }, { startAudioOnly });
  return { ...s, ctl, phases, audio, quality };
}
afterEach(() => jest.useRealTimers());

describe('reconnecting (a Wi-Fi <-> 4G/5G switch or a few seconds without network)', () => {
  it('shows "reconnecting", then "live" again when LiveKit resumes the same call; the room is never closed', () => {
    const t = bind();
    t.bus.emit(RoomEvent.Reconnecting);
    jest.advanceTimersByTime(8_000);
    t.bus.emit(RoomEvent.Reconnected);
    jest.advanceTimersByTime(60_000);
    expect(t.phases).toEqual(['reconnecting', 'live']);
    expect(t.room.disconnect).not.toHaveBeenCalled();
  });

  it('the signal-only reconnect (SignalReconnecting) counts too, and a second Reconnecting does not restart the clock', () => {
    const t = bind();
    t.bus.emit(RoomEvent.SignalReconnecting);
    jest.advanceTimersByTime(20_000);
    t.bus.emit(RoomEvent.Reconnecting);
    jest.advanceTimersByTime(RECONNECT_DEADLINE_MS - 20_000);
    expect(t.phases[t.phases.length - 1]).toBe('dropped');
  });

  it('ends the call only after ~30 s without a connection: "dropped" and the room is closed', () => {
    const t = bind();
    t.bus.emit(RoomEvent.Reconnecting);
    jest.advanceTimersByTime(RECONNECT_DEADLINE_MS - 1);
    expect(t.phases).toEqual(['reconnecting']);
    expect(t.room.disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(t.phases).toEqual(['reconnecting', 'dropped']);
    expect(t.room.disconnect).toHaveBeenCalledTimes(1);
    // the Disconnected event that follows our own disconnect does not report a second ending
    t.bus.emit(RoomEvent.Disconnected, 4);
    expect(t.phases).toEqual(['reconnecting', 'dropped']);
  });

  it('a hang-up is "ended"; a disconnect for any other reason is "dropped"', () => {
    const a = bind();
    a.bus.emit(RoomEvent.Disconnected, 1);
    expect(a.phases).toEqual(['ended']);
    const b = bind();
    b.bus.emit(RoomEvent.Disconnected, 5);
    expect(b.phases).toEqual(['dropped']);
    expect(stateAfterDisconnect(undefined, 1)).toBe('ended');
  });

  it('dispose() stops the clock: a screen that is gone is never told "dropped"', () => {
    const t = bind();
    t.bus.emit(RoomEvent.Reconnecting);
    t.ctl.dispose();
    jest.advanceTimersByTime(RECONNECT_DEADLINE_MS * 2);
    expect(t.phases).toEqual(['reconnecting']);
  });
});

describe('weak link: audio only, with a way back', () => {
  it('two poor reports in a row for the local side turn video off both ways and keep the sound', async () => {
    const t = bind();
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    expect(t.audio).toEqual([]);
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    await Promise.resolve();
    expect(t.audio).toEqual([[true, 'weak_link']]);
    expect(t.room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false);
    expect(t.sub.setSubscribed).toHaveBeenCalledWith(false);
  });

  it('one good report in between resets the count; the other side being poor does not matter', () => {
    const t = bind();
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'good', { identity: 'me' });
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'doc' });
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'doc' });
    expect(t.audio).toEqual([]);
    expect(t.quality.filter(([, , local]) => !local).map(([, l]) => l)).toEqual(['poor', 'poor']);
  });

  it('the server\'s advice (weak link or server pressure) starts the call audio only', async () => {
    const t = bind('server_pressure');
    await t.ctl.applyStartAdvice();
    expect(t.audio).toEqual([[true, 'server_pressure']]);
    expect(t.room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false);
  });

  it('"try video again" brings the camera and the other side\'s video back and re-arms the detector', async () => {
    const t = bind();
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    await t.ctl.tryVideo();
    expect(t.audio[t.audio.length - 1]).toEqual([false, null]);
    expect(t.room.localParticipant.setCameraEnabled).toHaveBeenLastCalledWith(true);
    expect(t.sub.setSubscribed).toHaveBeenLastCalledWith(true);
    t.bus.emit(RoomEvent.ConnectionQualityChanged, 'poor', { identity: 'me' });
    expect(t.ctl.isAudioOnly()).toBe(false); // one report is not enough again
  });
});

describe('helpers', () => {
  it('quality levels and bars', () => {
    expect(['excellent', 'good', 'poor', 'lost', 'weird'].map(qualityLevel)).toEqual(['excellent', 'good', 'poor', 'lost', 'unknown']);
    expect((['excellent', 'good', 'poor', 'lost', 'unknown'] as const).map(qualityBars)).toEqual([3, 2, 1, 0, 0]);
  });
  it('the poor tracker', () => {
    const t = poorConnectionTracker();
    expect(t.report('poor', 'poor')).toBe(false);
    expect(t.report('poor', 'poor')).toBe(true);
    t.reset();
    expect(t.report('poor', 'poor')).toBe(false);
  });
  it('the room options keep simulcast, DTX, adaptive stream and speech audio', () => {
    const o = callRoomOptions({ VideoPresets: { h720: { resolution: 'r' }, h180: 1, h360: 2 }, AudioPresets: { speech: 's' } });
    expect(o).toMatchObject({ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true, dtx: true, audioPreset: 's', videoSimulcastLayers: [1, 2] } });
  });
});
