// X and Snapchat sign-in: the token is verified by the provider's own API; identity is the provider's account id, never an email.
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

type U = { id: string; role: string; active?: boolean; social_x_id?: string; social_snapchat_id?: string };

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
  svc.signToken = jest.fn(() => ({ accessToken: 'a', refreshToken: 'r' }));
  svc.publicUser = (u: unknown) => u;
  return { svc: svc as unknown as AuthService, created };
}

const respond = (body: unknown, status = 200) => jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('X and Snapchat sign-in', () => {
  const env = { ...process.env };
  beforeEach(() => { process.env.X_SIGNIN_ENABLED = '1'; process.env.SNAPCHAT_SIGNIN_ENABLED = '1'; });
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  it('is off until the provider is enabled', async () => {
    delete process.env.X_SIGNIN_ENABLED;
    await expect(service([]).svc.socialLogin({ provider: 'x', token: 't' })).rejects.toThrow('social_login_not_configured');
  });

  it('a token the provider rejects is refused', async () => {
    respond({ title: 'Unauthorized' }, 401);
    await expect(service([]).svc.socialLogin({ provider: 'x', token: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException);
    respond({}, 401);
    await expect(service([]).svc.socialLogin({ provider: 'snapchat', token: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('an answer without an account id is refused', async () => {
    respond({ data: { name: 'No Id' } });
    await expect(service([]).svc.socialLogin({ provider: 'x', token: 't' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a new X account creates a patient keyed by the X id, with no email taken from the request', async () => {
    const f = respond({ data: { id: '12345', name: 'Huda' } });
    const { svc, created } = service([]);
    const out = (await svc.socialLogin({ provider: 'x', token: 't', email: 'admin@nabd.test', name: 'Spoof' })) as { user: { role: string } };
    expect(out.user.role).toBe('patient');
    expect(created[0]).toMatchObject({ social_x_id: '12345', full_name: 'Huda', role: 'patient' });
    expect(created[0]).not.toHaveProperty('email');
    expect(String(f.mock.calls[0][0])).toContain('api.x.com/2/users/me');
  });

  it('a returning Snapchat account signs in to the same patient', async () => {
    respond({ data: { me: { externalId: 'snap-1', displayName: 'Sara' } } });
    const { svc, created } = service([{ id: 'p1', role: 'patient', social_snapchat_id: 'snap-1' }]);
    const out = (await svc.socialLogin({ provider: 'snapchat', token: 't' })) as { user: { id: string } };
    expect(out.user.id).toBe('p1');
    expect(created).toHaveLength(0);
  });

  it('a staff or provider account is never opened this way', async () => {
    respond({ data: { id: '9' } });
    await expect(service([{ id: 'a1', role: 'admin', social_x_id: '9' }]).svc.socialLogin({ provider: 'x', token: 't' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a banned patient cannot sign back in', async () => {
    respond({ data: { me: { externalId: 's2' } } });
    await expect(service([{ id: 'p2', role: 'patient', active: false, social_snapchat_id: 's2' }]).svc.socialLogin({ provider: 'snapchat', token: 't' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
