// ACCEPTANCE — X and Snapchat sign-in (owner decision 2026-10-05: "we need them, wire them
// properly"). Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
//
// Required behaviour (POST /auth/social-login, AuthService.socialLogin):
// - For provider "x" and "snapchat" the app sends the OAuth authorization CODE, the PKCE
//   code_verifier and the redirect_uri, never an access token. The SERVER exchanges the code
//   with its own client secret, so the token is known to be issued to Nabd's client:
//     X:        POST https://api.x.com/2/oauth2/token (HTTP Basic X_CLIENT_ID:X_CLIENT_SECRET),
//               then GET https://api.x.com/2/users/me  -> data.id, data.name, data.confirmed_email?
//     Snapchat: POST https://accounts.snapchat.com/accounts/oauth2/token (client_id + client_secret),
//               then https://kit.snapchat.com/v1/me    -> data.me.externalId, data.me.displayName
// - redirect_uri must be one of X_REDIRECT_URIS / SNAPCHAT_REDIRECT_URIS (comma list); otherwise 400.
// - Missing client id/secret: 503 social_login_not_configured.
// - The account is linked by the provider's user id, stored in the `social_identities`
//   collection of the same database as `users`: { provider, provider_user_id, user_id }.
//   The same provider id always opens the same account.
// - An email is used only when the provider says it is confirmed (X confirmed_email). It may
//   link an existing PATIENT with that email; a staff/provider email is refused (403), and
//   nothing is written. The email/name in the request body are never trusted.
// - With no confirmed email a new patient is created without an email and the response says
//   `needs_contact: true` (the app then asks for a phone or email). A banned or deactivated
//   account is refused (403).
// - Any provider failure (code exchange or /me) is 401; nothing is written.
// - Google and Apple keep working as before (token). The Q107 unit test that expects X and
//   Snapchat to be refused is superseded by this file; only that one case may change.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthService } from '../../src/modules/auth/auth.service';
import { SocialLoginDto } from '../../src/modules/auth/auth.dto';
import { UserSchema } from '../../src/schemas/user.schema';
import { PatientProfileSchema } from '../../src/schemas/patient-profile.schema';

jest.setTimeout(60_000);

type Call = { url: string; init?: RequestInit };
type Out = { user: { id: string; role: string; email?: string }; needs_contact?: boolean };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('X and Snapchat sign-in: server-side code exchange, linked by provider id', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let users: Model<Record<string, unknown>>;
  let svc: AuthService;
  let calls: Call[];
  const env = { ...process.env };

  /** Fake providers. `x` / `snap` say what /me returns; `fail` makes the code exchange fail. */
  function providers(o: { x?: Record<string, unknown>; snap?: Record<string, unknown>; fail?: boolean; meFail?: boolean }) {
    calls = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      calls.push({ url, init });
      if (/api\.(x|twitter)\.com\/2\/oauth2\/token/.test(url) || /accounts\.snapchat\.com\/accounts\/oauth2\/token/.test(url)) {
        return o.fail ? json({ error: 'invalid_grant' }, 400) : json({ access_token: 'server-side-token', token_type: 'bearer', expires_in: 7200 });
      }
      if (/api\.(x|twitter)\.com\/2\/users\/me/.test(url)) return o.meFail ? json({ title: 'Unauthorized' }, 401) : json({ data: o.x });
      if (/kit\.snapchat\.com\/v1\/me/.test(url)) return o.meFail ? json({}, 401) : json({ data: { me: o.snap } });
      throw new Error(`unexpected fetch ${url}`);
    });
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'social_xs' }).asPromise();
    users = conn.model('User', UserSchema) as unknown as Model<Record<string, unknown>>;
    const patients = conn.model('PatientProfile', PatientProfileSchema);
    const s = Object.create(AuthService.prototype) as Record<string, unknown>;
    s.userModel = users;
    s.patientModel = patients;
    s.events = { emit: jest.fn() };
    s.signToken = jest.fn(() => ({ accessToken: 'a', refreshToken: 'r' }));
    s.publicUser = (u: Record<string, unknown>) => ({ id: u.id, role: u.role, email: u.email });
    svc = s as unknown as AuthService;
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => {
    process.env.X_CLIENT_ID = 'x-client';
    process.env.X_CLIENT_SECRET = 'x-secret';
    process.env.X_REDIRECT_URIS = 'nabdplus://oauth/x';
    process.env.SNAPCHAT_CLIENT_ID = 'snap-client';
    process.env.SNAPCHAT_CLIENT_SECRET = 'snap-secret';
    process.env.SNAPCHAT_REDIRECT_URIS = 'nabdplus://oauth/snapchat';
    await users.deleteMany({});
    await conn.collection('social_identities').deleteMany({});
    await users.create([
      { id: 'adm-1', full_name: 'Admin', email: 'admin@nabd.test', phone: '+966500000001', role: 'admin', active: true },
      { id: 'pat-1', full_name: 'Existing', email: 'sara@example.test', phone: '+966500000002', role: 'patient', active: true },
      { id: 'pat-banned', full_name: 'Banned', email: 'banned@example.test', phone: '+966500000003', role: 'patient', active: false },
    ]);
  });
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  const x = (extra: Record<string, unknown> = {}) => ({ provider: 'x', code: 'auth-code', code_verifier: 'v'.repeat(43), redirect_uri: 'nabdplus://oauth/x', ...extra });
  const snap = (extra: Record<string, unknown> = {}) => ({ provider: 'snapchat', code: 'auth-code', code_verifier: 'v'.repeat(43), redirect_uri: 'nabdplus://oauth/snapchat', ...extra });
  const login = (body: Record<string, unknown>) => (svc as unknown as { socialLogin: (b: Record<string, unknown>) => Promise<Out> }).socialLogin(body);
  const links = () => conn.collection('social_identities').find({}).toArray();

  it('SocialLoginDto: X/Snapchat need code + code_verifier + redirect_uri; Google/Apple keep token; others refused', () => {
    const errs = (b: Record<string, unknown>) => validateSync(plainToInstance(SocialLoginDto, b), { whitelist: true, forbidNonWhitelisted: true }).length;
    expect(errs(x())).toBe(0);
    expect(errs(snap())).toBe(0);
    expect(errs({ provider: 'google', token: 'ya29.t' })).toBe(0);
    expect(errs({ provider: 'apple', token: 'eyJ.a.b' })).toBe(0);
    expect(errs({ provider: 'x', token: 'access-token-from-the-app' })).toBeGreaterThan(0);
    expect(errs({ provider: 'snapchat', code: 'c' })).toBeGreaterThan(0);
    expect(errs({ provider: 'facebook', token: 't' })).toBeGreaterThan(0);
  });

  it('X: the server exchanges the code with its own secret and PKCE verifier, then reads /2/users/me', async () => {
    providers({ x: { id: 'x-123', name: 'Sara X', username: 'sarax' } });
    const out = await login(x());
    const exchange = calls.find((c) => /oauth2\/token/.test(c.url))!;
    expect(exchange).toBeDefined();
    const headers = new Headers(exchange.init?.headers);
    expect(headers.get('authorization')).toBe(`Basic ${Buffer.from('x-client:x-secret').toString('base64')}`);
    const form = new URLSearchParams(String(exchange.init?.body));
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('auth-code');
    expect(form.get('code_verifier')).toBe('v'.repeat(43));
    expect(form.get('redirect_uri')).toBe('nabdplus://oauth/x');
    const me = calls.find((c) => /users\/me/.test(c.url))!;
    expect(new Headers(me.init?.headers).get('authorization')).toBe('Bearer server-side-token');
    expect(out.user.role).toBe('patient');
    expect(out.needs_contact).toBe(true);
    expect(await links()).toEqual([expect.objectContaining({ provider: 'x', provider_user_id: 'x-123', user_id: out.user.id })]);
  });

  it('X: the same provider id opens the same account; no second user is created', async () => {
    providers({ x: { id: 'x-123', name: 'Sara X' } });
    const first = await login(x());
    const count = await users.countDocuments({});
    providers({ x: { id: 'x-123', name: 'Sara X renamed' } });
    const second = await login(x());
    expect(second.user.id).toBe(first.user.id);
    expect(await users.countDocuments({})).toBe(count);
    expect(await links()).toHaveLength(1);
  });

  it('the email and name in the request body are never trusted', async () => {
    providers({ x: { id: 'x-777', name: 'Attacker' } });
    const out = await login(x({ email: 'admin@nabd.test', name: 'Admin' }));
    expect(out.user.id).not.toBe('adm-1');
    expect(out.user.role).toBe('patient');
    expect(out.user.email ?? null).not.toBe('admin@nabd.test');
  });

  it('a confirmed X email links the existing PATIENT with that email', async () => {
    providers({ x: { id: 'x-sara', name: 'Sara', confirmed_email: 'sara@example.test' } });
    const out = await login(x());
    expect(out.user.id).toBe('pat-1');
    expect(out.needs_contact ?? false).toBe(false);
    expect(await links()).toEqual([expect.objectContaining({ provider: 'x', provider_user_id: 'x-sara', user_id: 'pat-1' })]);
  });

  it('a confirmed X email of a staff account is refused, and nothing is written', async () => {
    providers({ x: { id: 'x-adm', name: 'A', confirmed_email: 'admin@nabd.test' } });
    await expect(login(x())).rejects.toBeInstanceOf(ForbiddenException);
    expect(await links()).toHaveLength(0);
    expect(await users.countDocuments({})).toBe(3);
  });

  it('a banned account linked to the provider id is refused', async () => {
    await conn.collection('social_identities').insertOne({ provider: 'x', provider_user_id: 'x-banned', user_id: 'pat-banned' });
    providers({ x: { id: 'x-banned', name: 'B' } });
    await expect(login(x())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a failed code exchange or /me is 401 and writes nothing', async () => {
    providers({ fail: true });
    await expect(login(x())).rejects.toBeInstanceOf(UnauthorizedException);
    providers({ x: { id: 'x-1' }, meFail: true });
    await expect(login(x())).rejects.toBeInstanceOf(UnauthorizedException);
    providers({ x: { name: 'no id' } });
    await expect(login(x())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await links()).toHaveLength(0);
    expect(await users.countDocuments({})).toBe(3);
  });

  it('a redirect_uri that is not configured is refused before any provider call', async () => {
    providers({ x: { id: 'x-1' } });
    await expect(login(x({ redirect_uri: 'https://evil.example/cb' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it('without client id/secret the provider is off (503)', async () => {
    delete process.env.X_CLIENT_SECRET;
    providers({ x: { id: 'x-1' } });
    await expect(login(x())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('Snapchat: server-side exchange with client secret, linked by externalId, no email -> needs_contact', async () => {
    providers({ snap: { externalId: 'snap-ext-1', displayName: 'Sara Snap' } });
    const out = await login(snap());
    const exchange = calls.find((c) => /accounts\.snapchat\.com/.test(c.url))!;
    const form = new URLSearchParams(String(exchange.init?.body));
    const basic = new Headers(exchange.init?.headers).get('authorization');
    // client credentials either in the form or as HTTP Basic
    expect(form.get('client_secret') === 'snap-secret' || basic === `Basic ${Buffer.from('snap-client:snap-secret').toString('base64')}`).toBe(true);
    expect(form.get('code_verifier')).toBe('v'.repeat(43));
    expect(out.user.role).toBe('patient');
    expect(out.needs_contact).toBe(true);
    expect(await links()).toEqual([expect.objectContaining({ provider: 'snapchat', provider_user_id: 'snap-ext-1', user_id: out.user.id })]);
    providers({ snap: { externalId: 'snap-ext-1', displayName: 'Sara Snap' } });
    expect((await login(snap())).user.id).toBe(out.user.id);
  });
});
