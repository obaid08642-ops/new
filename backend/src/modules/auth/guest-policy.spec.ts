/**
 * 21.3 Verify: "A test per row of the matrix; an admin change takes effect without a deploy."
 * Real MongoDB for the matrix, the real guard over HTTP, and the real route tables read from the controllers.
 */
import { Controller, Get, INestApplication, MiddlewareConsumer, Module, NestModule, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { DEFAULT_GUEST_CAPABILITIES, GuestCapability, GuestPermissionMatrixService } from './permission-matrix.service';
import { CAPABILITIES_WITHOUT_ROUTE, GUEST_ROUTE_RULES, GuestPolicyGuard, capabilitiesFor, policyPath } from './guest-policy';

jest.setTimeout(120_000);

/** One representative request per row of the matrix (method, path as the client calls it). */
const ROWS: Array<{ capability: GuestCapability; method: string; url: string }> = [
  { capability: 'browse', method: 'GET', url: '/api/v1/doctors?specialty=x' },
  { capability: 'search', method: 'GET', url: '/api/v1/search?q=para' },
  { capability: 'cart', method: 'POST', url: '/api/v1/cart/items' },
  { capability: 'pharmacy_order', method: 'POST', url: '/api/v1/patient/pharmacy/orders' },
  { capability: 'book_consultation', method: 'POST', url: '/api/v1/care/appointments' },
  { capability: 'book_lab', method: 'POST', url: '/api/v1/labs/bookings' },
  { capability: 'book_radiology', method: 'POST', url: '/api/v1/radiology/bookings' },
  { capability: 'book_nursing', method: 'POST', url: '/api/v1/home-care/bookings' },
  { capability: 'pay_card', method: 'POST', url: '/api/v1/payments/intent/consultation/a1' },
  { capability: 'pay_cash', method: 'POST', url: '/api/v1/patient/pharmacy/orders/o1/cod/register' },
  { capability: 'insurance', method: 'POST', url: '/api/v1/users/me/insurance' },
  { capability: 'family', method: 'GET', url: '/api/v1/family/members' },
  { capability: 'medical_records', method: 'GET', url: '/api/v1/medical-reports/mine' },
  { capability: 'prescription_refill', method: 'POST', url: '/api/v1/health/reminders/r1/refill' },
  { capability: 'loyalty', method: 'GET', url: '/api/v1/loyalty/account' },
  { capability: 'saved_cards', method: 'GET', url: '/api/v1/payment-methods' },
];

describe('GUEST_ROUTE_RULES (the table)', () => {
  it('has a row for every capability of the matrix, except the ones nothing implements yet', () => {
    const covered = new Set(GUEST_ROUTE_RULES.map((r) => r.capability));
    const missing = (Object.keys(DEFAULT_GUEST_CAPABILITIES) as GuestCapability[]).filter((c) => !covered.has(c) && c !== 'chat_history');
    expect(missing).toEqual([]);
    expect(CAPABILITIES_WITHOUT_ROUTE).toEqual(['saved_cards']);
  });

  it.each(ROWS)('$capability: $method $url needs exactly that capability', ({ capability, method, url }) => {
    expect(capabilitiesFor(method, url)).toContain(capability);
  });

  it('the public insurer list (companies, their plans and networks) needs no account; the patient\'s own insurance still does', () => {
    for (const u of ['/api/v1/insurance/companies', '/api/v1/insurance/companies/', '/api/v1/insurance/companies?x=1', '/api/v1/insurance/companies/c1/networks', '/api/v1/insurance/companies/c1/plans']) {
      expect(capabilitiesFor('GET', u)).toEqual([]);
    }
    for (const u of ['/api/v1/insurance/policy', '/api/v1/insurance/active', '/api/v1/insurance/requests', '/api/v1/insurance/save-policy', '/api/v1/insurance/companies-x', '/api/v1/insurance']) {
      expect(capabilitiesFor('GET', u)).toContain('insurance');
    }
  });

  it('an unrelated route needs nothing, and a read does not trip a write-only row', () => {
    for (const [m, u] of [['GET', '/api/v1/auth/me'], ['GET', '/api/v1/care/appointments'], ['GET', '/api/v1/labs/bookings/mine'], ['GET', '/api/v1/health/vitals'], ['POST', '/api/v1/auth/guest']] as const) {
      expect(capabilitiesFor(m, u)).toEqual([]);
    }
  });

  it('paths are matched without the api prefix, the query string or a trailing slash', () => {
    expect(policyPath('/api/v1/cart/items/?a=1')).toBe('/cart/items');
    expect(policyPath('/api/cart')).toBe('/cart');
    expect(policyPath('/cart')).toBe('/cart');
  });

  // The table names real routes: a rename of a controller or a method would silently stop covering it.
  it('every row still points at a route that exists in the controllers', () => {
    const src = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../', f), 'utf8');
    const checks: Array<[string, string[]]> = [
      ['modules/cart/cart.module.ts', ["@Controller('cart')"]],
      ['modules/labs/labs.controller.ts', ["@Controller('labs')", "@Post('bookings')"]],
      ['modules/radiology/radiology.controller.ts', ["@Controller('radiology')", "@Post('bookings')"]],
      ['modules/care/appointments.controller.ts', ["@Controller('care/appointments')", '@Post()']],
      ['modules/home-care/patient-home-care.controller.ts', ["@Controller('home-care')", "@Post('bookings')"]],
      ['modules/pharmacy/pharmacy.controllers.ts', ["@Controller('patient/pharmacy')", "@Post('orders')", "orders/:id/cod/register", "orders/:id/payment-retry"]],
      ['modules/payments/payments.module.ts', ["@Controller('payments')", "@Post('intent/:type/:id')"]],
      ['modules/moyasar/moyasar.module.ts', ["@Controller('moyasar')", "@Post('payments')"]],
      ['modules/family/family.controller.ts', ["@Controller('family')"]],
      ['modules/medical-reports/medical-reports.controller.ts', ["@Controller('medical-reports')"]],
      ['modules/lab-results/lab-results.controller.ts', []],
      ['modules/medical-profile/medical-profile.controller.ts', ["@Controller('medical-profile')"]],
      ['modules/loyalty/loyalty.controller.ts', ["@Controller('loyalty')"]],
      ['modules/users/users.insurance.controller.ts', ["@Controller('users/me/insurance')"]],
      ['modules/health/health.controller.ts', ["@Controller('health')", "@Post('reminders/:id/refill')", "@Post('medications/:id/refill')"]],
      ['modules/search/search.controller.ts', ["@Controller('search')"]],
    ];
    const gone: string[] = [];
    for (const [file, needles] of checks) {
      let text = '';
      try { text = src(file); } catch { if (needles.length) gone.push(`${file} is missing`); continue; }
      for (const n of needles) if (!text.includes(n)) gone.push(`${file}: ${n}`);
    }
    expect(gone).toEqual([]);
  });
});

describe('the matrix over HTTP with a real database', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let app: INestApplication;
  let matrix: GuestPermissionMatrixService;
  let who: Record<string, unknown> | undefined;

  @Controller()
  class Routes {
    @Get('doctors') doctors() { return { ok: 1 }; }
    @Get('family/members') family() { return { ok: 1 }; }
    @Get('loyalty/account') loyalty() { return { ok: 1 }; }
    @Post('cart/items') cart() { return { ok: 1 }; }
    @Post('patient/pharmacy/orders/:id/cod/register') cod() { return { ok: 1 }; }
    @Get('chat/threads/:id/messages') messages() { return { ok: 1 }; }
    @Get('chat/threads') threads() { return { threads: [{ id: 't1', closed_at: null }, { id: 't2', closed_at: '2026-01-01' }], total: 2 }; }
    @Get('auth/me') me() { return { ok: 1 }; }
  }

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'guest-policy' }).asPromise();
    matrix = new GuestPermissionMatrixService(conn);
    @Module({
      controllers: [Routes],
      providers: [
        { provide: GuestPermissionMatrixService, useValue: matrix },
        { provide: getConnectionToken(), useValue: conn },
        { provide: APP_GUARD, useClass: GuestPolicyGuard },
      ],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) { consumer.apply((req: any, _res: any, next: () => void) => { req.user = who; next(); }).forRoutes('*'); }
    }
    const mod = await Test.createTestingModule({ imports: [TestModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => { await app?.close(); await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { await conn.collection('guest_capability_matrix').deleteMany({}); await conn.collection('chat_threads').deleteMany({}); (matrix as any).cache = null; who = { id: 'g1', is_guest: true }; });

  const hit = (m: 'get' | 'post', url: string) => (request(app.getHttpServer()) as any)[m](url);

  it('by default a guest may browse and add to the cart, and is told an account is needed for family and loyalty', async () => {
    expect((await hit('get', '/api/doctors')).status).toBe(200);
    expect((await hit('post', '/api/cart/items')).status).toBe(201);
    const fam = await hit('get', '/api/family/members');
    expect(fam.status).toBe(403);
    expect(fam.body).toMatchObject({ code: 'account_required', capability: 'family' });
    const loy = await hit('get', '/api/loyalty/account');
    expect(loy.body).toMatchObject({ code: 'account_required', capability: 'loyalty' });
  });

  it('a full account is never restricted by the matrix', async () => {
    who = { id: 'u1', is_guest: false };
    expect((await hit('get', '/api/family/members')).status).toBe(200);
    expect((await hit('get', '/api/loyalty/account')).status).toBe(200);
    who = undefined;
    expect((await hit('get', '/api/family/members')).status).toBe(200);          // anonymous: the other guards decide
  });

  it('an admin change takes effect on the next request, in both directions, without a deploy', async () => {
    expect((await hit('post', '/api/patient/pharmacy/orders/o1/cod/register')).status).toBe(201);     // pay_cash is on by default
    await matrix.setCapabilities({ pay_cash: false }, 'admin-1');
    const denied = await hit('post', '/api/patient/pharmacy/orders/o1/cod/register');
    expect(denied.status).toBe(403);
    expect(denied.body.capability).toBe('pay_cash');
    await matrix.setCapabilities({ family: true }, 'admin-1');
    expect((await hit('get', '/api/family/members')).status).toBe(200);          // family was off, now on
    expect((await hit('post', '/api/patient/pharmacy/orders/o1/cod/register')).status).toBe(403);   // and the earlier change was kept
    await matrix.setCapabilities({ pay_cash: true }, 'admin-1');
    expect((await hit('post', '/api/patient/pharmacy/orders/o1/cod/register')).status).toBe(201);
  });

  it('a patch changes only the keys it names (the old code reset every earlier change)', async () => {
    await matrix.setCapabilities({ browse: false }, 'a');
    await matrix.setCapabilities({ cart: false }, 'a');
    const m = await matrix.matrix();
    expect(m.browse).toBe(false);
    expect(m.cart).toBe(false);
    expect(m.search).toBe(true);
  });

  it('an unknown capability or a non-boolean value is refused and nothing is stored', async () => {
    await expect(matrix.setCapabilities({ flying: true } as never, 'a')).rejects.toThrow('unknown_guest_capability');
    await expect(matrix.setCapabilities({ browse: 'yes' } as never, 'a')).rejects.toThrow('guest_capability_must_be_boolean');
    expect(await conn.collection('guest_capability_matrix').countDocuments({})).toBe(0);
  });

  it('chat history: a guest reads an open thread but not a closed one, unless the admin allows it', async () => {
    await conn.collection('chat_threads').insertMany([{ id: 'open', is_active: true }, { id: 'done', is_active: true, closed_at: new Date() }, { id: 'inactive', is_active: false }]);
    expect((await hit('get', '/api/chat/threads/open/messages')).status).toBe(200);
    for (const id of ['done', 'inactive']) {
      const r = await hit('get', `/api/chat/threads/${id}/messages`);
      expect(r.status).toBe(403);
      expect(r.body).toMatchObject({ code: 'account_required', capability: 'chat_history' });
    }
    await matrix.setCapabilities({ chat_history: true }, 'admin-1');
    expect((await hit('get', '/api/chat/threads/done/messages')).status).toBe(200);
    who = { id: 'u1', is_guest: false };
    await matrix.setCapabilities({ chat_history: false }, 'admin-1');
    expect((await hit('get', '/api/chat/threads/done/messages')).status).toBe(200);   // an account always may
  });
});
