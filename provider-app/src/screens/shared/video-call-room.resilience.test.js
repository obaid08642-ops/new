/**
 * The provider's call room on a bad network. A lost connection used to start a whole new call (POST /calls/initiate again, up to 3 times)
 * on the very first Disconnected event; the patient could be rung again. Now LiveKit's own resume (ICE restart) is shown as "reconnecting" on
 * the SAME call and only ~30 s without a connection re-joins. The behaviour itself is the shared state machine, tested in
 * patient-app/__tests__/call-resilience.test.ts; here: the two copies are the same file, it behaves in this app's jest, and the room uses it.
 */
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const R = require('../../calls/callResilience');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

describe('shared call resilience', () => {
  it('is the same file as the patient app\'s (no drift between the two copies)', () => {
    const own = read('../../calls/callResilience.ts').replace(/^\/\/ Identical to [^\n]*\n/, '');
    const patient = read('../../../../patient-app/src/calls/callResilience.ts');
    expect(own).toBe(patient);
  });

  it('resumes a lost connection on the same call and drops only after 30 s', () => {
    jest.useFakeTimers();
    try {
      const bus = new EventEmitter();
      const room = {
        localParticipant: { identity: 'me', setCameraEnabled: jest.fn(async () => undefined) },
        remoteParticipants: new Map(),
        on: (e, f) => bus.on(e, f), off: (e, f) => bus.off(e, f), disconnect: jest.fn(),
      };
      const phases = [];
      R.bindCallResilience(room, {
        RoomEvent: { Reconnecting: 'rc', SignalReconnecting: 'src', Reconnected: 'ok', Disconnected: 'dc', ConnectionQualityChanged: 'q' },
        ConnectionQuality: { Poor: 'poor' }, DisconnectReason: { CLIENT_INITIATED: 1 },
      }, { onPhase: (p) => phases.push(p), onAudioOnly: () => undefined, onQuality: () => undefined });
      bus.emit('rc');
      jest.advanceTimersByTime(10_000);
      bus.emit('ok');
      jest.advanceTimersByTime(60_000);
      expect(phases).toEqual(['reconnecting', 'live']);
      expect(room.disconnect).not.toHaveBeenCalled();
      bus.emit('rc');
      jest.advanceTimersByTime(R.RECONNECT_DEADLINE_MS);
      expect(phases).toEqual(['reconnecting', 'live', 'reconnecting', 'dropped']);
      expect(room.disconnect).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('VideoCallRoom uses it', () => {
  const source = read('./VideoCallRoom.tsx');

  it('no longer re-joins (a new session) on the first Disconnected event', () => {
    expect(source).not.toMatch(/room\.on\(RoomEvent\.Disconnected/);
    expect(source).toContain('bindCallResilience(');
    // the re-join with backoff stays, but only for a call that did not come back by itself
    expect(source).toMatch(/next === 'dropped' && !\(endedRef\.current as boolean\)/);
  });

  it('shows reconnecting, sound only with a way back, and a quality indicator per side', () => {
    for (const s of ['setReconnecting(true)', 'Reconnecting your call', 'tryVideo()', 'Try video again', 'qualityBars(quality.local)', 'qualityBars(quality.remote)', 'startAudioOnly']) {
      expect(source).toContain(s);
    }
  });

  it('builds its room from the shared options and honours the server\'s audio-only advice', () => {
    expect(source).toContain('callRoomOptions({ VideoPresets, AudioPresets })');
    expect(source).toContain('audio_only_reason');
  });
});
