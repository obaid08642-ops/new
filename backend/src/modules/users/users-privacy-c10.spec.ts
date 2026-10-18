import { UsersService } from './users.service';

// OC-C C-10: privacy settings serve the full 5-key contract; sessions flag the current one.
const FIVE = ['location', 'analytics', 'shareData', 'marketing', 'thirdParty'];

function serviceFor(opts: { stored?: any; sessions?: Array<{ jti: string; device: string | null; ttl: number }> }) {
  const service: any = Object.create(UsersService.prototype);
  const store: any = { privacy_settings: opts.stored };
  service.patientRepository = {
    findOne: jest.fn().mockImplementation(async () => (store.privacy_settings === undefined ? null : { privacy_settings: store.privacy_settings })),
    updateOne: jest.fn().mockImplementation(async (_q: any, u: any) => { store.privacy_settings = u?.$set?.privacy_settings; return {}; }),
  };
  const redis: any = {};
  for (const s of opts.sessions || []) {
    redis[`refresh:${s.jti}`] = JSON.stringify({ u: 'pat-1', d: s.device });
    redis[`ttl:refresh:${s.jti}`] = s.ttl;
  }
  service.redisService = {
    getClient: jest.fn(() => ({
      smembers: jest.fn().mockResolvedValue((opts.sessions || []).map((s) => s.jti)),
      get: jest.fn().mockImplementation(async (k: string) => redis[k] ?? null),
      ttl: jest.fn().mockImplementation(async (k: string) => redis[`ttl:${k}`] ?? -1),
    })),
  };
  return service as UsersService;
}

describe('OC C-10 privacy and sessions', () => {
  it('serves the full 5-key privacy contract with safe defaults', async () => {
    const out: any = await serviceFor({}).getPrivacySettings('pat-1');
    for (const k of FIVE) expect(typeof out[k]).toBe('boolean');
  });

  it('merges stored switches over the defaults', async () => {
    const out: any = await serviceFor({ stored: { marketing: true } }).getPrivacySettings('pat-1');
    expect(out.marketing).toBe(true);
    for (const k of FIVE.filter((x) => x !== 'marketing')) expect(typeof out[k]).toBe('boolean');
  });

  it('flags the current session by device', async () => {
    const full = 'device-abc-current-device-id-1234567890';
    const svc: any = serviceFor({ sessions: [{ jti: 'j1', device: full, ttl: 99 }, { jti: 'j2', device: 'other-device', ttl: 99 }] });
    const rows: any[] = await svc.getSessions('pat-1', full.slice(0, 32));
    expect(rows.find((r: any) => r.id === 'j1')?.is_current).toBe(true);
    expect(rows.find((r: any) => r.id === 'j2')?.is_current).toBe(false);
  });

  it('leaves is_current false when the token carries no device', async () => {
    const svc: any = serviceFor({ sessions: [{ jti: 'j1', device: 'device-abc', ttl: 99 }] });
    const rows: any[] = await svc.getSessions('pat-1');
    expect(rows[0]?.is_current).toBe(false);
  });

  // 21.7: the apps list and end sessions through these routes; they carry what a person recognises a device by and end
  // the sign-in through the one place sessions end.
  it('21.7 lists a readable label and a masked address, never the raw user agent or the full address', async () => {
    const svc: any = serviceFor({ sessions: [{ jti: 'j1', device: 'd1', ttl: 99 }] });
    const client = svc.redisService.getClient();
    client.get = jest.fn(async () => JSON.stringify({ u: 'pat-1', d: 'd1', s: 'sid-1', c: 1_800_000_000_000, l: 1_800_000_100_000, ip: '203.0.113.9', ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36' }));
    svc.redisService.getClient = jest.fn(() => client);
    const rows: any[] = await svc.getSessions('pat-1');
    expect(rows[0]).toMatchObject({ id: 'j1', session_id: 'sid-1', label: 'Chrome · Windows', platform: 'web', ip: '203.0.*.*' });
    expect(JSON.stringify(rows)).not.toMatch(/Mozilla|203\.0\.113\.9/);
  });

  it('21.7 ending a session goes through the auth service when it is there', async () => {
    const svc: any = serviceFor({});
    svc.auth = { revokeSessionByJti: jest.fn(async () => ({ ok: true })) };
    svc.redisService.getClient = jest.fn(() => ({ sismember: jest.fn(async () => 1), del: jest.fn(), srem: jest.fn() }));
    await expect(svc.revokeSession('pat-1', 'j1')).resolves.toEqual({ ok: true });
    expect(svc.auth.revokeSessionByJti).toHaveBeenCalledWith('pat-1', 'j1');
  });
});

