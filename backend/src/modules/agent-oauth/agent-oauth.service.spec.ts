import { createHash, randomBytes } from 'crypto';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { JwtService } from '@nestjs/jwt';
import { AgentOAuthService } from './agent-oauth.service';
import { mcpResource } from './agent-oauth.constants';

jest.setTimeout(120_000);

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pkce = () => {
  const verifier = b64url(randomBytes(48));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
};
const REDIRECT = 'https://client.example/cb';

describe('AgentOAuthService (AC-1)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: AgentOAuthService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'unit-jwt-secret';
    process.env.NABD_PUBLIC_URL = 'https://site.example';
    process.env.MCP_PUBLIC_URL = 'https://mcp.example';
    delete process.env.AGENT_OAUTH_SECRET;
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'agent_oauth_unit' }).asPromise();
    svc = new AgentOAuthService(conn);
    await svc.onModuleInit();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  const params = (clientId: string, challenge: string, extra: Record<string, string> = {}) => ({
    response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge,
    code_challenge_method: 'S256', scope: 'agent:read agent:order', state: 'st', ...extra,
  });
  const connect = async (patient = 'pat-1') => {
    const c = await svc.register({ client_name: 'Unit', redirect_uris: [REDIRECT] });
    const p = pkce();
    const { redirect_to } = await svc.decide(patient, params(c.client_id, p.challenge), 'approve');
    const code = new URL(redirect_to).searchParams.get('code') as string;
    const tok = await svc.token({ grant_type: 'authorization_code', code, client_id: c.client_id, redirect_uri: REDIRECT, code_verifier: p.verifier });
    return { clientId: c.client_id, ...tok };
  };

  it('registers public clients only, with https or loopback redirects', async () => {
    await expect(svc.register({ client_name: 'X', redirect_uris: ['http://example.com/cb'] })).rejects.toMatchObject({ status: 400 });
    await expect(svc.register({ client_name: 'X', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'client_secret_basic' })).rejects.toMatchObject({ status: 400 });
    await expect(svc.register({ client_name: 'X', redirect_uris: [REDIRECT], grant_types: ['client_credentials'] })).rejects.toMatchObject({ status: 400 });
    const ok = await svc.register({ client_name: 'X', redirect_uris: ['http://localhost:8765/cb'] });
    expect(ok.token_endpoint_auth_method).toBe('none');
  });

  it('refuses plain PKCE, unknown scopes and unregistered redirects', async () => {
    const c = await svc.register({ client_name: 'X', redirect_uris: [REDIRECT] });
    const { verifier, challenge } = pkce();
    await expect(svc.validateAuthorize(params(c.client_id, verifier, { code_challenge_method: 'plain' }))).rejects.toMatchObject({ status: 400 });
    await expect(svc.validateAuthorize(params(c.client_id, challenge, { scope: 'agent:read admin' }))).rejects.toMatchObject({ response: { error: 'invalid_scope' } });
    await expect(svc.validateAuthorize(params(c.client_id, challenge, { redirect_uri: 'https://evil.example/cb' }))).rejects.toMatchObject({ status: 400 });
    await expect(svc.validateAuthorize(params(c.client_id, challenge, { resource: 'https://other.example' }))).rejects.toMatchObject({ response: { error: 'invalid_target' } });
  });

  it('issues a 15-minute token for the MCP resource that the patient guard secret cannot verify', async () => {
    const t = await connect();
    expect(t.expires_in).toBe(900);
    const p = await svc.verifyAccessToken(t.access_token);
    expect(p).toMatchObject({ patient_id: 'pat-1', client_id: t.clientId, scopes: ['agent:read', 'agent:order'] });
    expect(() => new JwtService({ secret: 'unit-jwt-secret' }).verify(t.access_token)).toThrow();
    const claims: any = new JwtService({}).decode(t.access_token);
    expect(claims.aud).toBe(mcpResource());
  });

  it('a patient session token is never an agent token', async () => {
    const patientJwt = new JwtService({ secret: 'unit-jwt-secret' }).sign({ id: 'pat-1', sub: 'pat-1', role: 'patient' });
    expect(await svc.verifyAccessToken(patientJwt)).toBeNull();
  });

  it('reusing a rotated refresh token ends that grant', async () => {
    const t = await connect();
    const next = await svc.token({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.clientId });
    await expect(svc.token({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.clientId })).rejects.toMatchObject({ response: { error: 'invalid_grant' } });
    // the replay revoked the session: the newest tokens are dead too
    expect(await svc.verifyAccessToken(next.access_token)).toBeNull();
    await expect(svc.token({ grant_type: 'refresh_token', refresh_token: next.refresh_token, client_id: t.clientId })).rejects.toMatchObject({ response: { error: 'invalid_grant' } });
  });

  it('disconnecting ends every token of that client for that patient only', async () => {
    const mine = await connect('pat-2');
    const other = await connect('pat-3');
    await svc.revokeConnection('pat-2', mine.clientId);
    expect(await svc.verifyAccessToken(mine.access_token)).toBeNull();
    expect(await svc.verifyAccessToken(other.access_token)).not.toBeNull();
    expect((await svc.listConnections('pat-2')).map((c) => c.client_id)).not.toContain(mine.clientId);
    await expect(svc.revokeConnection('pat-3', mine.clientId)).rejects.toMatchObject({ status: 404 });
  });

  it('blocking a client in the admin list ends its tokens and its new authorizations', async () => {
    const t = await connect('pat-4');
    await svc.adminSetBlocked(t.clientId, true);
    expect(await svc.verifyAccessToken(t.access_token)).toBeNull();
    await expect(svc.validateAuthorize(params(t.clientId, pkce().challenge))).rejects.toMatchObject({ response: { error: 'invalid_client' } });
  });

  it('a public client cannot revoke another client\'s token by naming itself', async () => {
    const t = await connect('pat-5');
    const intruder = await svc.register({ client_name: 'Intruder', redirect_uris: [REDIRECT] });
    await svc.revoke(t.refresh_token, intruder.client_id);
    expect(await svc.verifyAccessToken(t.access_token)).not.toBeNull();
    await svc.revoke(t.refresh_token, t.clientId);
    expect(await svc.verifyAccessToken(t.access_token)).toBeNull();
  });
});
