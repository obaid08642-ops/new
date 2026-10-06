// Q107 (found while testing R11 §5 lead 3): POST /auth/social-login decoded an
// Apple / X / Snapchat "token" without checking any signature, then logged in
// whatever account owned that email, staff and providers included. Reproduced
// on the local stack: provider "apple" with an unsigned token carrying
// admin@nabd.test returned an admin access token. Google access tokens were
// accepted from any OAuth client (no audience check).
import { generateKeyPairSync } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
import { AuthService } from './auth.service';

const unsigned = (payload: Record<string, unknown>) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
const appleToken = (payload: Record<string, unknown>) => new JwtService().sign(payload, {
  privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  algorithm: 'RS256', keyid: 'apple-kid', issuer: 'https://appleid.apple.com', audience: 'plus.nabd.web', expiresIn: 300,
});

function service(users: Record<string, { id: string; role: string; email: string; active?: boolean }>) {
  const svc = Object.create(AuthService.prototype) as Record<string, unknown>;
  svc.userModel = {
    findOne: jest.fn(async ({ email }: { email: string }) => (users[email] ? { ...users[email], save: jest.fn() } : null)),
    create: jest.fn(async (doc: Record<string, unknown>) => ({ ...doc, id: 'new-patient', save: jest.fn() })),
  };
  svc.patientModel = { create: jest.fn() };
  svc.events = { emit: jest.fn() };
  svc.signToken = jest.fn(() => ({ accessToken: 'a', refreshToken: 'r' }));
  svc.publicUser = (u: unknown) => u;
  return svc as unknown as AuthService;
}

describe('social login verifies the provider token (Q107)', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_IDS = 'web-client.apps.googleusercontent.com';
    process.env.APPLE_SIGNIN_CLIENT_IDS = 'plus.nabd.web';
  });
  afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

  const staff = { 'admin@nabd.test': { id: 'adm', role: 'admin', email: 'admin@nabd.test' } };

  it('an unsigned Apple token is refused', async () => {
    await expect(service(staff).socialLogin({ provider: 'apple', token: unsigned({ email: 'admin@nabd.test' }) })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('X and Snapchat no longer take a token from the device (R12.social-xs supersedes this case)', async () => {
    // R12.social-xs: the app now sends the authorization code, the PKCE verifier and the redirect
    // URI, and the server does the exchange with its own secret. A device token is refused, so the
    // unsigned-JWT bypass these providers used to have stays closed.
    for (const provider of ['x', 'snapchat'] as const) {
      await expect(service(staff).socialLogin({ provider, token: unsigned({ email: 'admin@nabd.test' }) })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('a Google token issued to another OAuth client is refused', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ aud: 'someone-else', email: 'p@example.test', email_verified: 'true', expires_in: '3000' })));
    await expect(service({}).socialLogin({ provider: 'google', token: 'ya29.token' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a valid provider token never opens a staff or provider account', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ aud: 'web-client.apps.googleusercontent.com', email: 'admin@nabd.test', email_verified: 'true', expires_in: '3000' })));
    await expect(service(staff).socialLogin({ provider: 'google', token: 'ya29.token' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a signed Apple token for a new email creates a patient', async () => {
    const jwk = { ...keys.publicKey.export({ format: 'jwk' }), kid: 'apple-kid', alg: 'RS256', use: 'sig' };
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ keys: [jwk] })));
    const svc = service({});
    const out = await svc.socialLogin({ provider: 'apple', token: appleToken({ sub: 'apple-1', email: 'new@example.test', email_verified: 'true' }) });
    expect((out as { user: { role: string } }).user.role).toBe('patient');
  });

  it('without configured client ids social login is off', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_IDS;
    await expect(service({}).socialLogin({ provider: 'google', token: 'ya29.token' })).rejects.toThrow('social_login_not_configured');
  });

  it('a banned patient cannot sign back in through Google', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ aud: 'web-client.apps.googleusercontent.com', email: 'banned@example.test', email_verified: 'true', expires_in: '3000' })));
    const svc = service({ 'banned@example.test': { id: 'p9', role: 'patient', email: 'banned@example.test', active: false } });
    await expect(svc.socialLogin({ provider: 'google', token: 'ya29.token' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
