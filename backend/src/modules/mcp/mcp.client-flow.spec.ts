import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentOAuthService } from '../agent-oauth/agent-oauth.service';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { AGENT_TOOL_SCOPES } from '../agent-oauth/agent-oauth.constants';

/**
 * An MCP client walking the whole ordering flow over real HTTP: initialize, tools/list,
 * unauthenticated call (401 + RFC 9728 pointer), the metadata document it points to, then
 * every hold/order tool with a token. Each answer must carry a Nabd checkout link, and
 * nothing in the flow pays or selects an offer.
 */
const TOKEN = 'agent-token';
const PRINCIPAL = { patient_id: 'pat-a', client_id: 'client-1', session_id: 's1', scopes: ['agent:read', 'agent:order', 'agent:book'] };

function build() {
  const idem = new Map<string, unknown>();
  const conn: any = {
    collection: (name: string) => {
      if (name === 'medicines') {
        return { find: () => ({ toArray: async () => [{ id: 'med-otc', name_ar: 'بنادول', name_en: 'Panadol', price: 12 }] }) };
      }
      if (name === 'agent_idempotency_keys') {
        return {
          findOne: async (f: any) => idem.get(`${f.tool}|${f.key}`) ?? null,
          insertOne: async (d: any) => { idem.set(`${d.tool}|${d.key}`, d); return {}; },
        };
      }
      return { findOne: async () => null, insertOne: async () => ({}), updateOne: async () => ({}) };
    },
  };
  const booked = (id: string) => jest.fn(async (_u: unknown, b: any) => ({ id, scheduled_at: b.scheduled_at ?? '2099-01-01T07:00:00.000Z' }));
  const deps = {
    pharmacyOrders: { create: jest.fn(async () => ({ id: 'ord-1', status: 'DRAFT' })), submit: jest.fn(async () => ({ id: 'ord-1', status: 'READY_FOR_SPLIT' })), list: jest.fn(async () => []) },
    pharmacyOffers: { listForPatient: jest.fn(async () => []) },
    care: { doctorSlots: jest.fn(async () => ({ slots: [{ start: '2099-01-01T07:00:00.000Z', available: true }] })) },
    appts: { create: jest.fn(async () => ({ id: 'appt-1' })), cancel: jest.fn(), listMine: jest.fn(async () => []) },
    locks: { reserve: jest.fn(async () => ({ id: 'lock-1', expires_at: '2099-01-01T07:10:00.000Z' })), releaseQuietly: jest.fn() },
    labs: { book: booked('lab-1'), cancel: jest.fn(), getBooking: jest.fn() },
    radiology: { book: booked('rad-1'), cancel: jest.fn(), getBooking: jest.fn() },
    nursing: { book: booked('nur-1'), cancel: jest.fn(), getBooking: jest.fn() },
    users: { getPatientProfile: jest.fn(async () => ({ addresses: [{ id: 'a1', city: 'Jeddah', is_default: true }] })) },
    redis: { getClient: () => null },
  };
  return { conn, deps };
}

describe('MCP client flow over HTTP (AI ordering)', () => {
  let app: INestApplication;
  let deps: ReturnType<typeof build>['deps'];

  beforeAll(async () => {
    const built = build();
    deps = built.deps;
    const tools = new AgentToolsService(
      deps.pharmacyOrders as any, deps.pharmacyOffers as any, deps.care as any, deps.appts as any, deps.locks as any,
      deps.labs as any, deps.nursing as any, deps.users as any, deps.redis as any, built.conn, deps.radiology as any,
    );
    const mod = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        { provide: McpService, useValue: new McpService({} as any, {} as any, {} as any, { collection: jest.fn() } as any) },
        { provide: AgentToolsService, useValue: tools },
        { provide: AgentOAuthService, useValue: { verifyAccessToken: async (t: string) => (t === TOKEN ? PRINCIPAL : null) } },
      ],
    })
      .overrideInterceptor(RedisCacheInterceptor)
      .useValue({ intercept: (_c: unknown, next: { handle(): unknown }) => next.handle() })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  const rpc = (name: string, args: Record<string, unknown>, auth = true) => {
    const r = request(app.getHttpServer()).post('/mcp').set('MCP-Protocol-Version', '2025-06-18');
    if (auth) r.set('Authorization', `Bearer ${TOKEN}`);
    return r.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  };

  it('initializes and lists every ordering tool with an input schema', async () => {
    const init = await request(app.getHttpServer()).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }).expect(200);
    expect(init.body.result.protocolVersion).toBe('2025-06-18');
    const list = await request(app.getHttpServer()).post('/mcp').set('MCP-Protocol-Version', '2025-06-18').send({ jsonrpc: '2.0', id: 2, method: 'tools/list' }).expect(200);
    const byName = new Map<string, any>(list.body.result.tools.map((t: any) => [t.name, t]));
    for (const name of [...Object.keys(AGENT_TOOL_SCOPES), 'consultation_slots']) {
      expect(byName.has(name)).toBe(true);
      expect(byName.get(name).inputSchema.type).toBe('object');
    }
    expect(byName.has('hold_radiology')).toBe(true);
    for (const write of ['create_pharmacy_request', 'hold_consultation', 'hold_lab', 'hold_nursing', 'hold_radiology', 'cancel_hold']) {
      expect(byName.get(write).inputSchema.required).toContain('idempotency_key');
    }
  });

  it('answers 401 with the RFC 9728 pointer, and the pointer resolves on the controller prefix', async () => {
    const res = await rpc('hold_radiology', {}, false).expect(401);
    const www: string = res.headers['www-authenticate'];
    expect(www).toMatch(/resource_metadata="https:\/\/mcp\.nabd\.plus\/\.well-known\/oauth-protected-resource\/api\/v1\/mcp"/);
    for (const p of ['/mcp/.well-known/oauth-protected-resource', '/mcp/.well-known/oauth-protected-resource/api/v1/mcp']) {
      const meta = await request(app.getHttpServer()).get(p).expect(200);
      expect(meta.body.resource).toMatch(/\/api\/v1\/mcp$/);
      expect(meta.body.authorization_servers).toHaveLength(1);
      expect(meta.body.scopes_supported).toEqual(expect.arrayContaining(['agent:order', 'agent:book']));
    }
    const as = await request(app.getHttpServer()).get('/mcp/.well-known/oauth-authorization-server').expect(200);
    expect(as.body.code_challenge_methods_supported).toContain('S256');
    expect(as.body.registration_endpoint).toMatch(/\/oauth\/register$/);
  });

  it.each([
    ['create_pharmacy_request', { items: [{ medicine_id: 'med-otc', qty: 2 }] }, '/ar/pharmacy/broadcast-status?orderId=ord-1'],
    ['hold_consultation', { doctor_id: 'd1', slot: '2099-01-01T07:00:00.000Z', mode: 'video' }, '/ar/consultations/booking-status?appointmentId=appt-1'],
    ['hold_lab', { service_id: 'cbc', scheduled_at: '2099-01-01T07:00:00.000Z' }, '/ar/diagnostics/bookings/labs/lab-1'],
    ['hold_radiology', { service_id: 'xr', provider_account_id: 'ctr', scheduled_at: '2099-01-01T07:00:00.000Z' }, '/ar/diagnostics/bookings/radiology/rad-1'],
    ['hold_nursing', { service_id: 'inj', scheduled_at: '2099-01-01T07:00:00.000Z' }, '/ar/nursing/visits/nur-1'],
  ])('%s returns a Nabd checkout link and takes no payment', async (tool, args, path) => {
    const res = await rpc(tool, { ...args, idempotency_key: `k-${tool}` }).expect(200);
    const out = res.body.result.structuredContent;
    expect(out.checkout_url).toBe(`https://nabd.plus${path}`);
    expect(JSON.stringify(out)).not.toMatch(/paid|card_number|moyasar/i);
  });

  it('a retry with the same idempotency key creates no second order', async () => {
    const before = deps.pharmacyOrders.create.mock.calls.length;
    const again = await rpc('create_pharmacy_request', { items: [{ medicine_id: 'med-otc', qty: 2 }], idempotency_key: 'k-create_pharmacy_request' }).expect(200);
    expect(again.body.result.structuredContent.order_id).toBe('ord-1');
    expect(deps.pharmacyOrders.create.mock.calls.length).toBe(before);
  });
});
