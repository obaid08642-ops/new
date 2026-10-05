import { RealtimeGateway } from './realtime.gateway';

// 14.13: Redis-backed presence/queues with a SHARED mock store standing in
// for a real Redis — two gateway instances (= two workers) share one mock so
// the tests prove cross-worker visibility. The mock implements only the
// RedisService surface the gateway uses.

function makeSharedMockRedis() {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    kv,
    sets,
    getClient() { return { status: 'ready' }; },
    async setJson(key: string, value: any) { kv.set(key, JSON.stringify(value)); },
    async getJson<T>(key: string): Promise<T | null> {
      const v = kv.get(key);
      return v === undefined ? null : (JSON.parse(v) as T);
    },
    async del(key: string) { kv.delete(key); sets.delete(key); },
    async sadd(key: string, ...members: string[]) {
      let s = sets.get(key);
      if (!s) { s = new Set(); sets.set(key, s); }
      for (const m of members) s.add(m);
    },
    async srem(key: string, ...members: string[]) {
      const s = sets.get(key);
      if (s) for (const m of members) s.delete(m);
    },
    async smembers(key: string): Promise<string[]> { return Array.from(sets.get(key) ?? []); },
  };
}

const makeRealtime = () => ({
  setServer: jest.fn(),
  setUserOnline: jest.fn().mockResolvedValue(undefined),
  setUserOffline: jest.fn().mockResolvedValue(undefined),
  redis: { getClient: () => ({ lrange: async () => [], del: async () => {} }) },
});

const makeServer = () => ({
  to: jest.fn(() => ({ emit: jest.fn() })),
  emit: jest.fn(),
});

const makeClient = (id: string): any => ({
  id,
  data: {},
  handshake: { auth: { token: 'tok' }, query: {} },
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  broadcast: { emit: jest.fn() },
  disconnect: jest.fn(),
});

const makeAppointment = (overrides: any = {}) => ({
  id: 'appt-1',
  patient_id: 'patient-1',
  booked_by_user_id: 'family-booker-1',
  doctor_user_id: 'doctor-user-1',
  doctor_id: 'doctor-profile-1',
  status: 'CONFIRMED',
  ...overrides,
});

const makeGateway = (deps: { jwt?: any; realtime?: any; appointments?: any; redis?: any }) => {
  const g = new RealtimeGateway(
    deps.jwt ?? { verifyAsync: jest.fn().mockResolvedValue({ id: 'patient-1', role: 'patient' }) },
    deps.realtime ?? makeRealtime(),
    deps.appointments ?? { findOne: jest.fn() },
    {} as any,
    {} as any,
    deps.redis,
    // The REST guard decides who connects (here it accepts the test patient).
    { canActivate: async (ctx: any) => { ctx.switchToHttp().getRequest().user = { id: 'patient-1', role: 'patient' }; return true; } } as any,
  );
  (g as any).server = makeServer();
  return g;
};

describe('RealtimeGateway Redis presence (14.13)', () => {
  it('shares connected sockets across workers via the shared store', async () => {
    const redis = makeSharedMockRedis();
    const workerA = makeGateway({ redis });
    const workerB = makeGateway({ redis });

    const socket = makeClient('sock-A1');
    await workerA.handleConnection(socket as any);

    // Worker B never saw the socket locally…
    expect((workerB as any).userSockets.has('patient-1')).toBe(false);
    // …but sees it through Redis (cross-worker visibility).
    await expect((workerB as any).remainingSockets('patient-1')).resolves.toEqual(['sock-A1']);
    // Raw store proof: user-socket set key holds the socket id.
    expect(Array.from((redis.sets.get('rt:user_sockets:patient-1') ?? []) as Set<string>)).toEqual(['sock-A1']);
    expect(JSON.parse(redis.kv.get('rt:socket:sock-A1') as string)).toMatchObject({ id: 'patient-1' });
  });

  it('shares the doctor waiting queue across workers via the shared store', async () => {
    const redis = makeSharedMockRedis();
    const appointments = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(makeAppointment()) }) };
    const workerA = makeGateway({ redis, appointments });
    const workerB = makeGateway({ redis, appointments });

    const socket = { ...makeClient('sock-A2'), data: { user: { id: 'patient-1' } } };
    await expect(workerA.handleWaitingRoomJoin(socket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: true });

    // Worker B reads the same queue through Redis despite an empty local mirror.
    expect((workerB as any).doctorQueues.has('doctor-profile-1')).toBe(false);
    await expect((workerB as any).readQueue('doctor-profile-1')).resolves.toEqual(['appt-1']);
    // Local mirror on the writing worker is also maintained (old spec compatibility).
    expect((workerA as any).doctorQueues.get('doctor-profile-1')).toEqual(['appt-1']);

    // A leave on worker A is visible to worker B.
    const leaveSocket = { ...makeClient('sock-A2'), data: { user: { id: 'patient-1' }, appointmentId: 'appt-1' } };
    await expect(workerA.handleWaitingRoomLeave(leaveSocket as any, { appointmentId: 'appt-1' })).resolves.toEqual({ ok: true });
    await expect((workerB as any).readQueue('doctor-profile-1')).resolves.toEqual([]);
  });

  it('falls back to in-memory tracking when RedisService is not injected', async () => {
    const worker = makeGateway({}); // no redis arg → undefined (legacy unit-test shape)
    const socket = makeClient('sock-local-1');
    await worker.handleConnection(socket as any);

    expect((worker as any).userSockets.get('patient-1')).toEqual(new Set(['sock-local-1']));
    await expect((worker as any).remainingSockets('patient-1')).resolves.toEqual(['sock-local-1']);

    socket.data.user = { id: 'patient-1' };
    await worker.handleDisconnect(socket as any);
    await expect((worker as any).remainingSockets('patient-1')).resolves.toEqual([]);
    expect((worker as any).server.emit).toHaveBeenCalledWith('user:offline', expect.objectContaining({ user_id: 'patient-1' }));
  });
});
