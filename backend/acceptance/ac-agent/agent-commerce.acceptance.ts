// ACCEPTANCE — Agent commerce (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md §3, cases 1–11).
// Written before AC-1 starts; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it). The HTTP contract it fixes is in README.md next to it.
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis;
// the test talks to it over HTTP only, like ChatGPT / Claude connectors do.
//
// Item map (spec §2): cases 1–4 = AC-1 (with the 401 of AC-2), 5–10 = AC-3, 11 = AC-5.
// Run one block while an item is open:  npx jest --config jest.acceptance.config.js acceptance/ac-agent -t "AC-1"
import { createHash, randomBytes } from 'crypto';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const SITE = 'https://site.ac-agent.test';      // NABD_PUBLIC_URL: the patient web (issuer, consent page, product/booking pages)
const MCP_HOST = 'https://mcp.ac-agent.test';    // MCP_PUBLIC_URL: the host that serves the backend's MCP endpoint
const MCP_RESOURCE = `${MCP_HOST}/api/v1/mcp`;   // the protected resource; access tokens carry it as `aud`
const REDIRECT = 'https://client.ac-agent.test/oauth/callback';
const SCOPES = 'agent:read agent:order agent:book';

const OTC = { id: 'med-otc', sku: 2001, name_ar: 'بنادول ٥٠٠', name_en: 'Panadol 500' };
const OTC2 = { id: 'med-otc-2', sku: 2004, name_ar: 'فيتامين سي', name_en: 'Vitamin C 1000' };
const RX = { id: 'med-rx', sku: 2002, name_ar: 'أوجمنتين ١ جم', name_en: 'Augmentin 1g' };
const CTL = { id: 'med-ctl', sku: 2003, name_ar: 'ترامادول ٥٠', name_en: 'Tramadol 50' };
const DOCTOR = 'doc-ac';
const PHARM = 'pharm-ac-1';

const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const pkce = () => {
  const verifier = b64url(randomBytes(48));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
};
const jwtPayload = (t: string) => JSON.parse(Buffer.from(t.split('.')[1] || '', 'base64url').toString('utf8') || 'null');
/** True when `url` is exactly on the patient web's origin (not a look-alike host that merely starts with it). */
const onSite = (url: unknown) => { try { return new URL(String(url)).origin === SITE; } catch { return false; } };
const noSecretIn = (url: string) => !/(access_token|refresh_token|id_token|[?&]token=|session|bearer)/i.test(url);

describe('Agent commerce (spec 2026-10-12 §3)', () => {
  const stack = new LiveStack();
  let patientA = '';
  let patientB = '';
  let addressA = '';

  const url = (p: string) => `${stack.servers[0].url}${p}`;
  const form = async (p: string, body: Record<string, string>) => {
    const res = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  };
  const rpc = async (method: string, params: Record<string, unknown>, token?: string) => {
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(url('/api/v1/mcp'), { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1e9), method, params }) });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  };
  /** tools/call → { status, ok, data, code }. A tool error is a JSON-RPC error or an isError result; either way it carries a code. */
  const tool = async (name: string, args: Record<string, unknown>, token?: string) => {
    const r = await rpc('tools/call', { name, arguments: args }, token);
    const result = r.body?.result;
    let data: any = result?.structuredContent;
    if (data === undefined && Array.isArray(result?.content)) {
      try { data = JSON.parse(result.content.find((c: any) => c?.type === 'text')?.text ?? 'null'); } catch { data = result.content; }
    }
    const err = r.body?.error;
    const isError = !!err || result?.isError === true;
    const code = String(err?.data?.error_code ?? err?.data?.code ?? data?.error_code ?? data?.code ?? data?.error ?? '');
    return { status: r.status, ok: r.status === 200 && !isError, data: isError ? (err?.data ?? data) : data, code, raw: r.body, headers: r.headers };
  };

  const register = (extra: Record<string, unknown> = {}) => stack.call(0, 'POST', '/api/v1/oauth/register', undefined, {
    client_name: 'Acceptance Assistant',
    redirect_uris: [REDIRECT],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    client_uri: 'https://client.ac-agent.test',
    logo_uri: 'https://client.ac-agent.test/logo.png',
    ...extra,
  });
  const authorizeParams = (clientId: string, challenge: string, extra: Record<string, string> = {}) => ({
    response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge,
    code_challenge_method: 'S256', scope: SCOPES, state: 'st-' + randomBytes(4).toString('hex'), resource: MCP_RESOURCE, ...extra,
  });
  /** The patient (signed in on Nabd Plus) approves the consent screen; returns the code from the redirect. */
  const approve = async (patientToken: string, params: Record<string, string>) => {
    const r = await stack.call(0, 'POST', '/api/v1/oauth/authorize', patientToken, { ...params, decision: 'approve' });
    const to = typeof r.body?.redirect_to === 'string' ? new URL(r.body.redirect_to) : null;
    return { r, to, code: to?.searchParams.get('code') || '' };
  };
  /** A full connection for a patient: register, consent, exchange. */
  const connect = async (patientToken: string, scope = SCOPES) => {
    const reg = await register();
    const clientId = reg.body?.client_id;
    const { verifier, challenge } = pkce();
    const { code } = await approve(patientToken, authorizeParams(clientId, challenge, { scope }));
    const tok = await form('/api/v1/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier, resource: MCP_RESOURCE });
    return { clientId, access: tok.body?.access_token as string, refresh: tok.body?.refresh_token as string, tok };
  };

  beforeAll(async () => {
    process.env.NABD_PUBLIC_URL = SITE;
    process.env.MCP_PUBLIC_URL = MCP_HOST;
    LiveStack.build();
    await stack.start(1, async (db) => {
      const pub = { public_eligibility: true, medical_review_status: 'approved', verified: true, category: 'medications', active: true };
      await db.collection('medicines').insertMany([
        { ...pub, ...OTC, price: 12, requires_prescription: false, controlled: false },
        { ...pub, ...OTC2, price: 20, requires_prescription: false, controlled: false },
        { ...pub, ...RX, price: 80, requires_prescription: true, controlled: false },
        { ...pub, ...CTL, price: 40, requires_prescription: true, controlled: true },
      ]);
      await db.collection('system_configs').insertOne({ key: 'pharmacy_broadcast_stages', value: [{ stage: 1, radius_km: 3, timeout_seconds: 300 }, { stage: 2, radius_km: 7, timeout_seconds: 300 }] });
      await db.collection('provider_accounts').insertOne({ id: PHARM, provider_type: 'pharmacy', status: 'approved', name_ar: 'صيدلية', token_version: 0 });
      await db.collection('users').insertOne({ id: 'doc-ac-user', full_name: 'Dr AC', role: 'doctor', active: true });
      await db.collection('provider_profiles').insertOne({
        id: DOCTOR, user_id: 'doc-ac-user', account_id: 'doc-ac-user', type: 'doctor', status: 'active',
        public_eligibility: true, medical_review_status: 'approved', indexing_eligibility: true,
        name_ar: 'د. اختبار', name_en: 'Dr Test', specialty: 'general', consultation_modes: ['video'],
        price_online: 150, working_hours: [{ day: 'all', open: '06:00', close: '14:00' }],
      });
    });
    patientA = await stack.patient('pat-a');
    patientB = await stack.patient('pat-b');
    const addr = await stack.call(0, 'POST', '/api/v1/users/me/addresses', patientA, { label: 'home', street: 'Street 1', city: 'Jeddah', lat: 21.5433, lng: 39.1728 });
    addressA = addr.body?.id;
  });
  afterAll(async () => { await stack.stop(); });

  // ───────────────────────────────── AC-1 ─────────────────────────────────
  describe('AC-1 case 1: dynamic registration; PKCE S256 required, plain refused', () => {
    it('the authorization-server metadata names real endpoints and S256 only', async () => {
      const r = await stack.call(0, 'GET', '/.well-known/oauth-authorization-server');
      expect(r.status).toBe(200);
      expect(r.body.issuer).toBe(SITE);
      expect(r.body.code_challenge_methods_supported).toEqual(['S256']);
      expect(r.body.response_types_supported).toEqual(['code']);
      expect(r.body.grant_types_supported).toEqual(expect.arrayContaining(['authorization_code', 'refresh_token']));
      expect(r.body.token_endpoint_auth_methods_supported).toContain('none');
      expect(r.body.scopes_supported).toEqual(expect.arrayContaining(['agent:read', 'agent:order', 'agent:book']));
      for (const k of ['authorization_endpoint', 'token_endpoint', 'registration_endpoint', 'revocation_endpoint']) {
        expect(typeof r.body[k]).toBe('string');
      }
      // the consent page is on the patient web; the machine endpoints are on this backend
      expect(onSite(r.body.authorization_endpoint)).toBe(true);
      for (const k of ['token_endpoint', 'registration_endpoint', 'revocation_endpoint']) {
        const p = new URL(r.body[k]).pathname;
        const probe = await fetch(url(p), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '' });
        expect([k, probe.status !== 404]).toEqual([k, true]);
      }
      // the old fake endpoints are gone from the document
      expect(JSON.stringify(r.body)).not.toMatch(/\/api\/auth\/(login|session\/exchange|register)/);
    });

    it('a client registers dynamically (RFC 7591) as a public client', async () => {
      const r = await register();
      expect(r.status).toBe(201);
      expect(typeof r.body.client_id).toBe('string');
      expect(r.body.client_id.length).toBeGreaterThanOrEqual(16);
      expect(r.body.redirect_uris).toEqual([REDIRECT]);
      expect(r.body.token_endpoint_auth_method).toBe('none');
      expect(r.body.client_secret).toBeUndefined();
    });

    it('registration refuses a non-https redirect (loopback http is allowed)', async () => {
      expect((await register({ redirect_uris: ['http://evil.ac-agent.test/cb'] })).status).toBe(400);
      expect((await register({ redirect_uris: ['http://127.0.0.1:33418/callback'] })).status).toBe(201);
    });

    it('the consent screen needs a signed-in patient and shows the client name and scopes', async () => {
      const reg = await register();
      const params = authorizeParams(reg.body.client_id, pkce().challenge);
      const qs = new URLSearchParams(params).toString();
      expect((await stack.call(0, 'GET', `/api/v1/oauth/authorize?${qs}`)).status).toBe(401);
      const r = await stack.call(0, 'GET', `/api/v1/oauth/authorize?${qs}`, patientA);
      expect(r.status).toBe(200);
      expect(r.body.client?.client_id).toBe(reg.body.client_id);
      expect(r.body.client?.client_name).toBe('Acceptance Assistant');
      expect(r.body.scopes.map((s: any) => (typeof s === 'string' ? s : s.scope)).sort()).toEqual(['agent:book', 'agent:order', 'agent:read']);
    });

    it('code_challenge_method=plain is refused and no code is issued', async () => {
      const reg = await register();
      const { verifier } = pkce();
      const params = authorizeParams(reg.body.client_id, verifier, { code_challenge_method: 'plain' });
      const get = await stack.call(0, 'GET', `/api/v1/oauth/authorize?${new URLSearchParams(params)}`, patientA);
      expect(get.status).toBe(400);
      const { r, code } = await approve(patientA, params);
      expect(r.status).toBe(400);
      expect(code).toBe('');
      expect(JSON.stringify(r.body)).toMatch(/invalid_request/);
    });

    it('a missing code_challenge is refused', async () => {
      const reg = await register();
      const params = authorizeParams(reg.body.client_id, '');
      delete (params as any).code_challenge;
      const { r, code } = await approve(patientA, params);
      expect(r.status).toBe(400);
      expect(code).toBe('');
    });

    it('a redirect_uri that was not registered is refused (never redirected to)', async () => {
      const reg = await register();
      const { r, code } = await approve(patientA, authorizeParams(reg.body.client_id, pkce().challenge, { redirect_uri: 'https://attacker.ac-agent.test/cb' }));
      expect(r.status).toBe(400);
      expect(code).toBe('');
      expect(JSON.stringify(r.body)).not.toContain('attacker.ac-agent.test');
    });

    it('an unknown scope is refused', async () => {
      const reg = await register();
      const { r } = await approve(patientA, authorizeParams(reg.body.client_id, pkce().challenge, { scope: 'agent:read patient:records' }));
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toMatch(/invalid_scope/);
    });

    it('approving redirects to the client with a code and the same state', async () => {
      const reg = await register();
      const params = authorizeParams(reg.body.client_id, pkce().challenge);
      const { r, to, code } = await approve(patientA, params);
      expect(r.status).toBe(200);
      expect(`${to!.origin}${to!.pathname}`).toBe(REDIRECT);
      expect(code.length).toBeGreaterThanOrEqual(20);
      expect(to!.searchParams.get('state')).toBe(params.state);
    });

    it('denying redirects with error=access_denied and no code', async () => {
      const reg = await register();
      const params = authorizeParams(reg.body.client_id, pkce().challenge);
      const r = await stack.call(0, 'POST', '/api/v1/oauth/authorize', patientA, { ...params, decision: 'deny' });
      const to = new URL(r.body.redirect_to);
      expect(to.searchParams.get('error')).toBe('access_denied');
      expect(to.searchParams.get('code')).toBeNull();
    });
  });

  describe('AC-1 case 2: the code needs the right verifier; the token is for the MCP resource only', () => {
    let clientId = '';
    let verifier = '';
    let code = '';

    beforeAll(async () => {
      clientId = (await register()).body.client_id;
      const p = pkce();
      verifier = p.verifier;
      code = (await approve(patientA, authorizeParams(clientId, p.challenge))).code;
    });

    it('without a verifier the exchange fails', async () => {
      const r = await form('/api/v1/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId });
      expect(r.status).toBe(400);
      expect(['invalid_request', 'invalid_grant']).toContain(r.body.error);
      expect(r.body.access_token).toBeUndefined();
    });

    it('with a wrong verifier the exchange fails', async () => {
      const r = await form('/api/v1/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: pkce().verifier });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_grant');
      expect(r.body.access_token).toBeUndefined();
    });

    let access = '';
    let refresh = '';
    it('with the right verifier: a 15-minute bearer token whose audience is the MCP resource, and a refresh token', async () => {
      const r = await form('/api/v1/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier, resource: MCP_RESOURCE });
      expect(r.status).toBe(200);
      expect(r.body.token_type).toMatch(/^bearer$/i);
      expect(r.body.expires_in).toBe(900);
      expect(typeof r.body.refresh_token).toBe('string');
      expect(r.headers.get('cache-control') || '').toMatch(/no-store/);
      access = r.body.access_token;
      refresh = r.body.refresh_token;
      const claims = jwtPayload(access);
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      expect(aud).toEqual([MCP_RESOURCE]);
      expect(claims.exp - claims.iat).toBe(900);
      expect(claims.client_id ?? claims.azp).toBe(clientId);
      expect(claims.sub).toBe('pat-a');
    });

    it('a code works once', async () => {
      const r = await form('/api/v1/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_grant');
    });

    it('the agent token is not a patient session: the patient API refuses it', async () => {
      expect((await stack.call(0, 'GET', '/api/v1/patient/pharmacy/orders', access)).status).toBe(401);
      expect((await stack.call(0, 'GET', '/api/v1/users/me/addresses', access)).status).toBe(401);
    });

    it('the refresh token rotates on every use; the old one stops working', async () => {
      const r1 = await form('/api/v1/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh, client_id: clientId });
      expect(r1.status).toBe(200);
      expect(r1.body.refresh_token).not.toBe(refresh);
      expect(jwtPayload(r1.body.access_token).aud).toEqual(expect.anything());
      const again = await form('/api/v1/oauth/token', { grant_type: 'refresh_token', refresh_token: refresh, client_id: clientId });
      expect(again.status).toBe(400);
      expect(again.body.error).toBe('invalid_grant');
    });

    it('another client cannot redeem this client\'s refresh token', async () => {
      const c = await connect(patientA);
      const other = (await register()).body.client_id;
      const r = await form('/api/v1/oauth/token', { grant_type: 'refresh_token', refresh_token: c.refresh, client_id: other });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_grant');
    });
  });

  describe('AC-1 case 3: revoking a connection kills its access and refresh tokens at once', () => {
    it('DELETE /patient/agent-connections/:clientId', async () => {
      const c = await connect(patientA);
      // the connection is listed with its scopes
      const list = await stack.call(0, 'GET', '/api/v1/patient/agent-connections', patientA);
      expect(list.status).toBe(200);
      const items: any[] = Array.isArray(list.body) ? list.body : list.body?.items ?? list.body?.connections ?? [];
      const mine = items.find((x) => x.client_id === c.clientId);
      expect(mine?.client_name).toBe('Acceptance Assistant');
      expect([...(mine?.scopes ?? [])].sort()).toEqual(['agent:book', 'agent:order', 'agent:read']);
      // patient B does not see A's connection
      const listB = await stack.call(0, 'GET', '/api/v1/patient/agent-connections', patientB);
      expect(JSON.stringify(listB.body)).not.toContain(c.clientId);
      // B cannot revoke A's connection: A's token still works afterwards
      await stack.call(0, 'DELETE', `/api/v1/patient/agent-connections/${c.clientId}`, patientB);
      expect((await tool('my_orders', {}, c.access)).status).not.toBe(401);
      const del = await stack.call(0, 'DELETE', `/api/v1/patient/agent-connections/${c.clientId}`, patientA);
      expect(del.status).toBeLessThan(300);
      // at once: no waiting for the 15-minute expiry
      expect((await tool('my_orders', {}, c.access)).status).toBe(401);
      const r = await form('/api/v1/oauth/token', { grant_type: 'refresh_token', refresh_token: c.refresh, client_id: c.clientId });
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('invalid_grant');
      const after = await stack.call(0, 'GET', '/api/v1/patient/agent-connections', patientA);
      expect(JSON.stringify(after.body)).not.toContain(c.clientId);
    });

    it('RFC 7009 revocation of the refresh token also ends the access token', async () => {
      const c = await connect(patientA);
      const rv = await form('/api/v1/oauth/revoke', { token: c.refresh, token_type_hint: 'refresh_token', client_id: c.clientId });
      expect(rv.status).toBe(200);
      const r = await form('/api/v1/oauth/token', { grant_type: 'refresh_token', refresh_token: c.refresh, client_id: c.clientId });
      expect(r.body.error).toBe('invalid_grant');
      expect((await tool('my_orders', {}, c.access)).status).toBe(401);
    });

    it('revoking an unknown token answers 200 (RFC 7009 §2.2)', async () => {
      const rv = await form('/api/v1/oauth/revoke', { token: 'not-a-token' });
      expect(rv.status).toBe(200);
    });
  });

  describe('AC-1 case 4: an authenticated tool without a token answers 401 with resource_metadata', () => {
    it('tools/call my_orders without a token', async () => {
      const r = await tool('my_orders', {});
      expect(r.status).toBe(401);
      const h = r.headers.get('www-authenticate') || '';
      expect(h).toMatch(/^Bearer\b/i);
      const m = h.match(/resource_metadata="([^"]+)"/);
      expect(m).not.toBeNull();
      // the URL resolves (on this backend) to RFC 9728 metadata for the MCP resource
      const meta = await fetch(url(new URL(m![1]).pathname));
      expect(meta.status).toBe(200);
      const doc: any = await meta.json();
      expect(doc.resource).toBe(MCP_RESOURCE);
      expect(doc.authorization_servers).toEqual([SITE]);
      expect(doc.scopes_supported).toEqual(expect.arrayContaining(['agent:read', 'agent:order', 'agent:book']));
      expect(doc.bearer_methods_supported).toEqual(['header']);
    });

    it('an invalid or expired token also gets 401 with the header', async () => {
      const r = await tool('my_orders', {}, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad');
      expect(r.status).toBe(401);
      expect(r.headers.get('www-authenticate') || '').toMatch(/resource_metadata=/);
    });

    it('a patient session token is not an agent token', async () => {
      expect((await tool('my_orders', {}, patientA)).status).toBe(401);
    });

    it('public tools stay anonymous', async () => {
      const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'acc', version: '1' } });
      expect(init.status).toBe(200);
      const r = await tool('search_medicines', { query: 'Panadol' });
      expect(r.status).toBe(200);
      expect(r.ok).toBe(true);
    });
  });

  // ───────────────────────────────── AC-3 ─────────────────────────────────
  describe('AC-3 cases 5–10: authenticated agent tools', () => {
    let a: Awaited<ReturnType<typeof connect>>;
    let b: Awaited<ReturnType<typeof connect>>;
    let readOnly: Awaited<ReturnType<typeof connect>>;
    let orderId = '';
    const ordersOf = (pid: string) => stack.db.collection('pharmacy_orders').countDocuments({ $or: [{ patient_account_id: pid }, { patient_id: pid }] });

    beforeAll(async () => {
      a = await connect(patientA);
      b = await connect(patientB);
      readOnly = await connect(patientA, 'agent:read');
    });

    describe('case 5: create_pharmacy_request', () => {
      it('one Rx line refuses the whole request with RX_VERIFICATION_REQUIRED and the upload and consult links', async () => {
        const before = await ordersOf('pat-a');
        const r = await tool('create_pharmacy_request', { idempotency_key: 'rx-mixed-1', items: [{ medicine_id: OTC.id, qty: 1 }, { medicine_id: RX.id, qty: 1 }], address_id: addressA }, a.access);
        expect(r.ok).toBe(false);
        expect(r.code).toBe('RX_VERIFICATION_REQUIRED');
        const links = JSON.stringify(r.data);
        expect(links).toContain(SITE);
        expect(links).toMatch(/prescription/i);
        expect(links).toMatch(/consultation|doctor/i);
        expect(await ordersOf('pat-a')).toBe(before);
      });

      it('a controlled line is refused the same way', async () => {
        const before = await ordersOf('pat-a');
        const r = await tool('create_pharmacy_request', { idempotency_key: 'ctl-1', items: [{ medicine_id: CTL.id, qty: 1 }], address_id: addressA }, a.access);
        expect(r.code).toBe('RX_VERIFICATION_REQUIRED');
        expect(await ordersOf('pat-a')).toBe(before);
      });

      it('agent:read alone cannot order (insufficient scope)', async () => {
        const before = await ordersOf('pat-a');
        const r = await tool('create_pharmacy_request', { idempotency_key: 'scope-1', items: [{ medicine_id: OTC.id, qty: 1 }], address_id: addressA }, readOnly.access);
        expect(r.ok).toBe(false);
        expect(r.status === 403 || /insufficient_scope/i.test(r.code + JSON.stringify(r.raw))).toBe(true);
        expect(await ordersOf('pat-a')).toBe(before);
      });

      it('a write without idempotency_key is refused', async () => {
        const before = await ordersOf('pat-a');
        const r = await tool('create_pharmacy_request', { items: [{ medicine_id: OTC.id, qty: 1 }], address_id: addressA }, a.access);
        expect(r.ok).toBe(false);
        expect(await ordersOf('pat-a')).toBe(before);
      });

      it('an OTC-only request creates a broadcast order the patient sees in /pharmacy/orders', async () => {
        const r = await tool('create_pharmacy_request', { idempotency_key: 'otc-1', items: [{ medicine_id: OTC.id, qty: 2 }], address_id: addressA }, a.access);
        expect(r.ok).toBe(true);
        orderId = r.data.order_id;
        expect(typeof orderId).toBe('string');
        expect(typeof r.data.status).toBe('string');
        expect(onSite(String(r.data.tracking_url))).toBe(true);
        expect(r.data.tracking_url).toContain(orderId);
        expect(noSecretIn(r.data.tracking_url)).toBe(true);
        expect(await stack.db.collection('pharmacy_broadcasts').findOne({ order_id: orderId })).not.toBeNull();
        const list = await stack.call(0, 'GET', '/api/v1/patient/pharmacy/orders', patientA);
        expect(JSON.stringify(list.body)).toContain(orderId);
      });
    });

    describe('case 6: idempotency', () => {
      it('the same idempotency_key twice gives one order', async () => {
        const before = await ordersOf('pat-a');
        const args = { idempotency_key: 'otc-twice', items: [{ medicine_id: OTC2.id, qty: 1 }], address_id: addressA };
        const r1 = await tool('create_pharmacy_request', args, a.access);
        const r2 = await tool('create_pharmacy_request', args, a.access);
        expect(r1.ok && r2.ok).toBe(true);
        expect(r2.data.order_id).toBe(r1.data.order_id);
        expect(await ordersOf('pat-a')).toBe(before + 1);
      });
    });

    describe('case 7: offers', () => {
      beforeAll(async () => {
        await stack.db.collection('pharmacy_offers').insertOne({
          id: 'off-ac-1', order_id: orderId, pharmacy_account_id: PHARM, status: 'submitted', version: 1,
          items: [{ order_item_id: 'x', unit_price: 12, qty: 2, availability: 'available' }], total: 24, currency: 'SAR', createdAt: new Date(),
        });
      });
      it('list_offers reads the live offers of the patient\'s own order', async () => {
        const r = await tool('list_offers', { order_id: orderId }, a.access);
        expect(r.ok).toBe(true);
        expect(JSON.stringify(r.data)).toContain('off-ac-1');
      });
      it('choose_offer_link changes nothing on the order and returns the patient\'s offer page', async () => {
        const strip = (d: any) => { if (!d) return d; const { _id, updatedAt, ...rest } = d; return rest; };
        const orderBefore = strip(await stack.db.collection('pharmacy_orders').findOne({ id: orderId }));
        const offersBefore = (await stack.db.collection('pharmacy_offers').find({ order_id: orderId }).toArray()).map(strip);
        const r = await tool('choose_offer_link', { order_id: orderId, offer_id: 'off-ac-1' }, a.access);
        expect(r.ok).toBe(true);
        const link = String(r.data.url ?? r.data.offer_url);
        expect(onSite(link)).toBe(true);
        expect(link).toContain(orderId);
        expect(noSecretIn(link)).toBe(true);
        expect(strip(await stack.db.collection('pharmacy_orders').findOne({ id: orderId }))).toEqual(orderBefore);
        expect((await stack.db.collection('pharmacy_offers').find({ order_id: orderId }).toArray()).map(strip)).toEqual(offersBefore);
      });
    });

    describe('case 8: hold_consultation', () => {
      const day = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      let real = '';
      let bookingId = '';
      let expiresAt = '';
      const apptsOf = (pid: string) => stack.db.collection('appointments').countDocuments({ patient_id: pid });

      beforeAll(async () => {
        const r = await stack.call(0, 'GET', `/api/v1/care/doctors/${DOCTOR}/slots?date=${day}&service_type=video`);
        real = (r.body?.slots ?? []).find((s: any) => s.available)?.start;
      });

      it('consultation_slots is public and returns the real slots only', async () => {
        const r = await tool('consultation_slots', { doctor_id: DOCTOR, date: day, mode: 'video' });
        expect(r.ok).toBe(true);
        expect(JSON.stringify(r.data)).toContain(real);
        expect(JSON.stringify(r.data)).not.toContain(`${day}T02:00:00.000Z`);
      });

      it('creates a pending booking with the normal hold and the existing payment page', async () => {
        expect(typeof real).toBe('string');
        const r = await tool('hold_consultation', { idempotency_key: 'hold-1', doctor_id: DOCTOR, slot: real, mode: 'video' }, a.access);
        expect(r.ok).toBe(true);
        bookingId = r.data.booking_id;
        expiresAt = r.data.expires_at;
        const appt = await stack.db.collection('appointments').findOne({ id: bookingId });
        expect(appt?.patient_id).toBe('pat-a');
        expect(appt?.doctor_id).toBe(DOCTOR);
        expect(appt?.status).toBe('PENDING');
        expect(new Date(appt!.slot_start).toISOString()).toBe(real);
        const ttl = new Date(expiresAt).getTime() - Date.now();
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(10 * 60_000 + 5_000);
        expect(onSite(String(r.data.payment_url))).toBe(true);
        expect(r.data.payment_url).toContain(bookingId);
        expect(noSecretIn(r.data.payment_url)).toBe(true);
        // the normal hold: the patient's own slot lock for that slot, with the same expiry
        const locks = await stack.call(0, 'GET', '/api/v1/slot-locks/mine', patientA);
        const lock = (locks.body as any[]).find((l) => l.provider_id === DOCTOR && new Date(l.slot_start).toISOString() === real);
        expect(lock?.status).toBe('held');
        expect(Math.abs(new Date(lock.expires_at).getTime() - new Date(expiresAt).getTime())).toBeLessThan(2_000);
      });

      it('an unpaid hold expires as usual: once its time has passed, the slot hold is free for others', async () => {
        // precondition: the hold of the previous test exists and still blocks the slot for others
        expect(await stack.db.collection('slotlocks').countDocuments({ provider_id: DOCTOR, patient_id: 'pat-a', status: 'held' })).toBe(1);
        expect((await stack.call(0, 'POST', '/api/v1/slot-locks/reserve', patientB, { provider_id: DOCTOR, booking_kind: 'consultation', slot_start: real })).status).toBe(409);
        await stack.db.collection('slotlocks').updateMany({ provider_id: DOCTOR, patient_id: 'pat-a', status: 'held' }, { $set: { expires_at: new Date(Date.now() - 1_000) } });
        const r = await stack.call(0, 'POST', '/api/v1/slot-locks/reserve', patientB, { provider_id: DOCTOR, booking_kind: 'consultation', slot_start: real });
        expect(r.status).toBeLessThan(300);
      });

      it('a slot that is not real is refused and nothing is created', async () => {
        const before = await apptsOf('pat-a');
        const fake = `${day}T02:00:00.000Z`; // on the 15-minute grid, outside the doctor's hours
        const r = await tool('hold_consultation', { idempotency_key: 'hold-fake', doctor_id: DOCTOR, slot: fake, mode: 'video' }, a.access);
        expect(r.ok).toBe(false);
        expect(await apptsOf('pat-a')).toBe(before);
      });

      it('cancel_hold releases only an unpaid hold the same client created', async () => {
        const other = await tool('cancel_hold', { idempotency_key: 'cancel-b', booking_id: bookingId }, b.access);
        expect(other.ok).toBe(false);
        const own = await tool('cancel_hold', { idempotency_key: 'cancel-a', booking_id: bookingId }, a.access);
        expect(own.ok).toBe(true);
        expect((await stack.db.collection('appointments').findOne({ id: bookingId }))?.status).toBe('CANCELLED');
      });
    });

    describe('case 9: patient A\'s token cannot read or act on patient B\'s items', () => {
      let orderB = '';
      beforeAll(async () => {
        const created = await stack.call(0, 'POST', '/api/v1/patient/pharmacy/orders', patientB, {
          items: [{ medicine_id: OTC.id, qty: 1 }], payment_method: 'cash', fulfillment: 'delivery',
          delivery_address: { label: 'home', city: 'Jeddah', district: 'Al Rawdah', street: 'Street 2', lat: 21.54, lng: 39.17 },
        });
        orderB = created.body?.id;
      });
      it('my_orders lists only A\'s orders', async () => {
        const r = await tool('my_orders', {}, a.access);
        expect(r.ok).toBe(true);
        expect(JSON.stringify(r.data)).toContain(orderId);
        expect(JSON.stringify(r.data)).not.toContain(orderB);
        expect(JSON.stringify(r.data)).not.toContain('pat-b');
      });
      it('list_offers and choose_offer_link refuse B\'s order', async () => {
        expect(typeof orderB).toBe('string');
        expect((await tool('list_offers', { order_id: orderId }, a.access)).ok).toBe(true); // control: A's own order works
        expect((await tool('list_offers', { order_id: orderB }, a.access)).ok).toBe(false);
        expect((await tool('choose_offer_link', { order_id: orderB, offer_id: 'off-ac-1' }, a.access)).ok).toBe(false);
      });
      it('my_bookings does not show B\'s bookings', async () => {
        await stack.db.collection('appointments').insertOne({ id: 'appt-b-only', patient_id: 'pat-b', doctor_id: DOCTOR, status: 'CONFIRMED', service_type: 'video', slot_start: new Date(Date.now() + 86_400_000), slot_end: new Date(Date.now() + 86_400_000 + 1_800_000) });
        const r = await tool('my_bookings', {}, a.access);
        expect(r.ok).toBe(true);
        expect(JSON.stringify(r.data)).not.toContain('appt-b-only');
      });
      it('cancel_hold refuses B\'s booking', async () => {
        const r = await tool('cancel_hold', { idempotency_key: 'cancel-b-appt', booking_id: 'appt-b-only' }, a.access);
        expect(r.ok).toBe(false);
        expect((await stack.db.collection('appointments').findOne({ id: 'appt-b-only' }))?.status).toBe('CONFIRMED');
      });
    });

    describe('case 10: every write leaves an audit entry with actor_type agent and the client id', () => {
      it('create_pharmacy_request, hold_consultation and cancel_hold are audited', async () => {
        const audit = async () => [
          ...(await stack.db.collection('audit_logs').find({ actor_type: 'agent' }).toArray()),
          ...(await stack.db.collection('mcp_audit_log').find({ actor_type: 'agent' }).toArray()),
        ];
        const rows = await audit();
        const has = (tool: string, ref: string) => rows.some((x) => x.client_id === a.clientId && JSON.stringify(x).includes(tool) && JSON.stringify(x).includes(ref));
        expect(has('create_pharmacy_request', orderId)).toBe(true);
        const held = await stack.db.collection('appointments').findOne({ patient_id: 'pat-a', doctor_id: DOCTOR });
        expect(has('hold_consultation', String(held?.id))).toBe(true);
        expect(has('cancel_hold', String(held?.id))).toBe(true);
        expect(rows.every((x) => typeof x.client_id === 'string' && x.client_id.length > 0)).toBe(true);
      });
    });
  });

  // ───────────────────────────────── AC-5 ─────────────────────────────────
  describe('AC-5 case 11: truthful discovery files', () => {
    const WEB = path.resolve(__dirname, '../../../patient-web');
    const files = () => {
      const out: string[] = [];
      const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out.push(p); } };
      walk(path.join(WEB, 'app/.well-known'));
      for (const f of ['app/llms.txt', 'app/llms-full.txt']) { const p = path.join(WEB, f); if (fs.existsSync(p)) fs.statSync(p).isDirectory() ? walk(p) : out.push(p); }
      return out.filter((f) => !/\.test\.tsx?$/.test(f));
    };

    it('no discovery file mentions x402, USDC or a wallet', () => {
      const hits = files().filter((f) => /x402|usdc|\bwallet\b/i.test(fs.readFileSync(f, 'utf8')));
      expect(hits).toEqual([]);
    });

    it('the AI discovery contract test exists and passes', () => {
      expect(fs.existsSync(path.join(WEB, 'tests/ai-discovery-contract.test.ts'))).toBe(true);
      const r = spawnSync('npx', ['vitest', 'run', 'tests/ai-discovery-contract.test.ts'], { cwd: WEB, encoding: 'utf8' });
      expect([r.status, (r.stdout + r.stderr).slice(-2000)]).toEqual([0, expect.any(String)]);
    });
  });
});
