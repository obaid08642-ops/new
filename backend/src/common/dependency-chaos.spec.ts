// 1c01b92 (review round 2), 15.11 chaos tests:
// - LiveKit: a getParticipant 404 is an answer, not an outage; it must not
//   open the room-service circuit. Mute/remove must report failure instead of
//   { success: true } when LiveKit failed.
// - Moyasar (payments adapter): fetch had no timeout and no breaker; a hung
//   gateway held the request open, and a dead one was called by every request.
jest.mock('livekit-server-sdk', () => {
  const fns = { listParticipants: jest.fn(), getParticipant: jest.fn(), mutePublishedTrack: jest.fn(), removeParticipant: jest.fn() };
  return { __fns: fns, RoomServiceClient: jest.fn().mockImplementation(() => fns), AccessToken: jest.fn() };
});

import { CircuitBreakerService } from './circuit-breaker.service';
import { LiveKitService } from '../modules/livekit/livekit.service';
import { MoyasarAdapter } from '../modules/payments/payments.module';
import { resetMoyasarBreakerForTests } from './moyasar-base';

type Fns = Record<'listParticipants' | 'getParticipant' | 'mutePublishedTrack' | 'removeParticipant', jest.Mock>;
const fns = (jest.requireMock('livekit-server-sdk') as { __fns: Fns }).__fns;
const notFound = () => Object.assign(new Error('participant not found'), { status: 404, code: 'not_found' });

describe('dependency chaos (1c01b92 round 2)', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    Object.assign(process.env, { LIVEKIT_URL: 'wss://lk.test', LIVEKIT_API_KEY: 'k', LIVEKIT_API_SECRET: 's' });
    Object.values(fns).forEach((f) => f.mockReset());
  });
  afterEach(() => { process.env = { ...saved }; });

  const livekit = () => new LiveKitService({} as never, {} as never, {} as never, new CircuitBreakerService());

  it('LiveKit: participant 404s do not open the room-service circuit', async () => {
    const lk = livekit();
    fns.getParticipant.mockRejectedValue(notFound());
    for (let i = 0; i < 15; i++) {
      await expect(lk.muteParticipant('room', 'gone', true)).resolves.toEqual({ success: false, reason: 'participant_not_found' });
    }
    fns.listParticipants.mockResolvedValue([{ identity: 'a', tracks: [] }]);
    await expect(lk.getRoomParticipants('room')).resolves.toHaveLength(1);
    expect(fns.listParticipants).toHaveBeenCalledTimes(1);
  });

  it('LiveKit: a failed mute reports failure', async () => {
    fns.getParticipant.mockResolvedValue({ identity: 'p', tracks: [{ sid: 't1' }, { sid: 't2' }] });
    fns.mutePublishedTrack.mockRejectedValueOnce(new Error('livekit down')).mockResolvedValueOnce({});
    await expect(livekit().muteParticipant('room', 'p', true)).resolves.toEqual({ success: false, reason: 'mute_failed', failed_tracks: 1 });
  });

  it('LiveKit: a failed remove reports failure', async () => {
    fns.removeParticipant.mockRejectedValue(new Error('livekit down'));
    await expect(livekit().removeParticipant('room', 'p')).resolves.toEqual({ success: false, reason: 'livekit_unavailable' });
  });

  describe('Moyasar adapter', () => {
    const realFetch = global.fetch;
    beforeEach(() => {
      Object.assign(process.env, { MOYASAR_API_KEY: 'sk_test', MOYASAR_TIMEOUT_MS: '100' });
      resetMoyasarBreakerForTests();
    });
    afterEach(() => { global.fetch = realFetch; });

    it('a hung gateway times out instead of holding the request', async () => {
      global.fetch = jest.fn((_url: unknown, init?: { signal?: AbortSignal }) => new Promise((_res, rej) => {
        init?.signal?.addEventListener('abort', () => rej(init.signal?.reason));
      })) as unknown as typeof fetch;
      const started = Date.now();
      await expect(new MoyasarAdapter().verify('pay_1')).rejects.toBeDefined();
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('a dead gateway opens the circuit: later calls fail fast without fetch', async () => {
      const f = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      global.fetch = f as unknown as typeof fetch;
      const adapter = new MoyasarAdapter();
      for (let i = 0; i < 13; i++) await expect(adapter.verify(`pay_${i}`)).rejects.toBeDefined();
      expect(f).toHaveBeenCalledTimes(10);
    });

    it('a 4xx answer is passed through and does not count as an outage', async () => {
      const f = jest.fn().mockImplementation(async () => new Response(JSON.stringify({ message: 'invalid' }), { status: 400 }));
      global.fetch = f as unknown as typeof fetch;
      const adapter = new MoyasarAdapter();
      for (let i = 0; i < 13; i++) await expect(adapter.refund(`pay_${i}`)).resolves.toMatchObject({ refunded: false });
      expect(f).toHaveBeenCalledTimes(13);
    });
  });
});
