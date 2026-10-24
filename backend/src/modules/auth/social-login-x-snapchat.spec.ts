// X and Snapchat sign-in: the token is verified by the provider's own API; identity is the provider's account id, never an email.
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

type U = { id: string; role: string; active?: boolean; social_x_id?: string; social_snapchat_id?: string };

const used = new Set<string>();
const redis = { set: jest.fn(async (k: string) => (used.has(k) ? null : (used.add(k), 'OK'))) };

function service(users: U[]) {
  const svc = Object.create(AuthService.prototype) as Record<string, unknown>;
  const created: Record<string, unknown>[] = [];
  svc.userModel = {
    findOne: jest.fn(async (q: Record<string, string>) => {
      const [k, v] = Object.entries(q)[0];
      const u = users.find((x) => (x as Record<string, unknown>)[k] === v);
      return u ? { ...u, save: jest.fn() } : null;
    }),
    create: jest.fn(async (doc: Record<string, unknown>) => { created.push(doc); return { ...doc, id: 'new-patient', save: jest.fn() }; }),
  };
  svc.patientModel = { create: jest.fn() };
  svc.events = { emit: jest.fn() };
  svc.redisService = { getClient: () => redis };
  svc.signToken = jest.fn(() => ({ accessToken: 'a', refreshToken: 'r' }));
  svc.publicUser = (u: unknown) => u;
  return { svc: svc as unknown as AuthService, created };
}

const CODE = { code: 'auth-code-1', code_verifier: 'v'.repeat(50), redirect_uri: 'https://nabd.test/ar/login/social-callback' };
/** First call is the token exchange, the next is the provider's /me. */
const provider = (me: unknown, meStatus = 200, tokenStatus = 200) =>
  jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(tokenStatus === 200 ? { access_token: 'ours' } : { error: 'invalid_grant' }), { status: tokenStatus }))
    .mockResolvedValue(new Response(JSON.stringify(me), { status: meStatus }));

describe('X and Snapchat sign-in (backend runs the code exchange)', () => {
  const env = { ...process.env };
  beforeEach(() => {
    used.clear();
    Object.assign(process.env, { X_CLIENT_ID: 'xid', X_CLIENT_SECRET: 'xsec', SNAPCHAT_CLIENT_ID: 'sid', SNAPCHAT_CLIENT_SECRET: 'ssec', SOCIAL_REDIRECT_URIS: CODE.redirect_uri });
  });
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  it('is off until our client credentials and the redirect allow-list are set', async () => {
    delete process.env.X_CLIENT_SECRET;
    await expect(service([]).svc.socialLogin({ provider: 'x', ...CODE })).rejects.toThrow('social_login_not_configured');
  });

  it('a raw access token (possibly issued to a foreign app) is refused without any provider call', async () => {
    const f = jest.spyOn(global, 'fetch');
    for (const p of ['x', 'snapchat'] as const) {
      await expect(service([]).svc.socialLogin({ provider: p, token: 'foreign-app-token' })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('a redirect URI outside the allow-list is refused before the exchange', async () => {
    const f = jest.spyOn(global, 'fetch');
    await expect(service([]).svc.socialLogin({ provider: 'x', ...CODE, redirect_uri: 'https://evil.test/cb' })).rejects.toThrow('redirect_uri_not_allowed');
    expect(f).not.toHaveBeenCalled();
  });

  it('a failed code exchange is refused', async () => {
    provider({}, 200, 400);
    await expect(service([]).svc.socialLogin({ provider: 'x', ...CODE })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('exchanges with OUR client credentials and the PKCE verifier', async () => {
    const f = provider({ data: { id: '12345', name: 'Huda' } });
    await service([]).svc.socialLogin({ provider: 'x', ...CODE });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.x.com/2/oauth2/token');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('xid:xsec').toString('base64')}`);
    expect(String(init.body)).toContain('code_verifier=' + CODE.code_verifier);
    expect(String((f.mock.calls[1] as [string])[0])).toContain('api.x.com/2/users/me');
  });

  it('a replayed code is refused', async () => {
    provider({ data: { id: '12345', name: 'Huda' } });
    const { svc } = service([]);
    await svc.socialLogin({ provider: 'x', ...CODE });
    await expect(svc.socialLogin({ provider: 'x', ...CODE })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('an answer without an account id is refused', async () => {
    provider({ data: { name: 'No Id' } });
    await expect(service([]).svc.socialLogin({ provider: 'x', ...CODE })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a new X account creates a patient keyed by the X id, with no email taken from the request', async () => {
    provider({ data: { id: '12345', name: 'Huda' } });
    const { svc, created } = service([]);
    const out = (await svc.socialLogin({ provider: 'x', ...CODE, email: 'admin@nabd.test', name: 'Spoof' })) as { user: { role: string } };
    expect(out.user.role).toBe('patient');
    expect(created[0]).toMatchObject({ social_x_id: '12345', full_name: 'Huda', role: 'patient' });
    expect(created[0]).not.toHaveProperty('email');
  });

  it('a returning Snapchat account signs in to the same patient', async () => {
    const f = provider({ data: { me: { externalId: 'snap-1', displayName: 'Sara' } } });
    const { svc, created } = service([{ id: 'p1', role: 'patient', social_snapchat_id: 'snap-1' }]);
    const out = (await svc.socialLogin({ provider: 'snapchat', ...CODE })) as { user: { id: string } };
    expect(out.user.id).toBe('p1');
    expect(created).toHaveLength(0);
    expect(f.mock.calls[0][0]).toBe('https://accounts.snapchat.com/login/oauth2/access_token');
  });

  it('a staff or provider account is never opened this way', async () => {
    provider({ data: { id: '9' } });
    await expect(service([{ id: 'a1', role: 'admin', social_x_id: '9' }]).svc.socialLogin({ provider: 'x', ...CODE })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a banned patient cannot sign back in', async () => {
    provider({ data: { me: { externalId: 's2' } } });
    await expect(service([{ id: 'p2', role: 'patient', active: false, social_snapchat_id: 's2' }]).svc.socialLogin({ provider: 'snapchat', ...CODE })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
