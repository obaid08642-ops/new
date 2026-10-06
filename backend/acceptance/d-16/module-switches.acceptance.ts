// ACCEPTANCE — D-16 module switches (owner decision 2026-10-06 item 16, issue #335; Queue C).
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit
// it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js, every module, every guard) on an in-memory
// MongoDB and a local Redis; two instances share the database like the production workers.
//
// Required behaviour:
//   - Twelve modules, one switch each, keys exactly:
//       pharmacy, consultations, labs_radiology, nursing, nutrition, maternity, mental_health,
//       family, insurance, loyalty, ai, articles
//   - GET /api/v1/modules (public, no token) -> { modules: { <key>: boolean, ... } } with all twelve.
//     A module never switched is ON.
//   - PUT /api/v1/admin/modules/:key { enabled: boolean, reason: string (>= 5 chars) }, admin only:
//     patient 403, unknown key 400 or 404, missing/short reason 400.
//   - While a module is OFF, the server refuses its patient-facing and public routes (reads and
//     writes) with HTTP 403 and a body carrying code "module_disabled" and the module key, BEFORE any
//     other processing (no 401/404/400 from the route itself, no write).
//     Routes per module (prefixes after /api/v1):
//       pharmacy        patient/pharmacy/*, pharmacy/chat/*
//       consultations   care/doctors*, care/appointments*, care/search, consultations/*
//       labs_radiology  labs/* , radiology/* (patient and public routes)
//       nursing         nursing/*, home-care/* (patient and public routes)
//       nutrition       nutrition/*
//       maternity       maternity/*
//       mental_health   mental-health/*
//       family          family/* (including family/chat)
//       insurance       insurance/*, users/me/insurance
//       loyalty         loyalty/*
//       ai              ai/* (patient routes)
//       articles        articles*
//     Other modules keep working. Admin routes are never blocked by a switch (the admin must still
//     manage a hidden module).
//   - The switch is instant on EVERY instance: after the admin turns a module off (or on) through
//     instance A, instance B follows within 5 seconds, without a restart.
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const KEYS = ['pharmacy', 'consultations', 'labs_radiology', 'nursing', 'nutrition', 'maternity', 'mental_health', 'family', 'insurance', 'loyalty', 'ai', 'articles'];

// [method, path] samples per module: public reads, patient reads and patient writes.
const ROUTES: Record<string, Array<[string, string, unknown?]>> = {
  pharmacy: [['GET', '/api/v1/patient/pharmacy/orders'], ['POST', '/api/v1/patient/pharmacy/orders', { items: [] }], ['GET', '/api/v1/pharmacy/chat/threads']],
  consultations: [['GET', '/api/v1/care/doctors'], ['GET', '/api/v1/care/appointments'], ['GET', '/api/v1/consultations/x-1']],
  labs_radiology: [['GET', '/api/v1/labs/services'], ['GET', '/api/v1/labs/bookings/mine'], ['GET', '/api/v1/radiology/services'], ['GET', '/api/v1/radiology/bookings/mine']],
  nursing: [['GET', '/api/v1/home-care/services'], ['GET', '/api/v1/home-care/providers'], ['GET', '/api/v1/nursing/bookings/mine']],
  nutrition: [['GET', '/api/v1/nutrition/foods'], ['GET', '/api/v1/nutrition/profile'], ['POST', '/api/v1/nutrition/water', { ml: 250 }]],
  maternity: [['GET', '/api/v1/maternity/profile'], ['GET', '/api/v1/maternity/content'], ['POST', '/api/v1/maternity/kicks', { count: 1 }]],
  mental_health: [['GET', '/api/v1/mental-health/mood'], ['POST', '/api/v1/mental-health/mood', { mood: 3 }], ['GET', '/api/v1/mental-health/dashboard']],
  family: [['GET', '/api/v1/family/my-group'], ['GET', '/api/v1/family/chat/messages'], ['POST', '/api/v1/family/create', { name: 'x' }]],
  insurance: [['GET', '/api/v1/insurance/companies'], ['GET', '/api/v1/insurance/my-policy'], ['GET', '/api/v1/users/me/insurance']],
  loyalty: [['GET', '/api/v1/loyalty/account'], ['GET', '/api/v1/loyalty/rewards'], ['POST', '/api/v1/loyalty/rewards/r-1/claim', {}]],
  ai: [['GET', '/api/v1/ai/triage/history'], ['POST', '/api/v1/ai/triage', { symptoms: 'headache' }], ['POST', '/api/v1/ai/drug-interactions', { medicines: ['a', 'b'] }]],
  articles: [['GET', '/api/v1/articles']],
};

const disabled = (r: { status: number; body: any }, key: string) =>
  r.status === 403 && JSON.stringify(r.body).includes('module_disabled') && JSON.stringify(r.body).includes(key);

describe('D-16: module switches', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const setModule = (i: number, key: string, enabled: boolean, reason = 'acceptance test switch') =>
    stack.call(i, 'PUT', `/api/v1/admin/modules/${key}`, admin, { enabled, reason });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(2);
    patient = await stack.patient();
    admin = await stack.admin();
  });
  afterAll(async () => { await stack.stop(); });

  it('GET /modules is public and lists all twelve modules, ON by default', async () => {
    const r = await stack.call(0, 'GET', '/api/v1/modules');
    expect(r.status).toBe(200);
    expect(Object.keys(r.body.modules).sort()).toEqual([...KEYS].sort());
    for (const k of KEYS) expect(r.body.modules[k]).toBe(true);
  });

  it('only an admin can switch, with a known key and a reason', async () => {
    expect((await stack.call(0, 'PUT', '/api/v1/admin/modules/loyalty', patient, { enabled: false, reason: 'not allowed' })).status).toBe(403);
    expect([400, 404]).toContain((await setModule(0, 'no_such_module', false)).status);
    expect((await stack.call(0, 'PUT', '/api/v1/admin/modules/loyalty', admin, { enabled: false })).status).toBe(400);
    expect((await stack.call(0, 'PUT', '/api/v1/admin/modules/loyalty', admin, { enabled: false, reason: 'no' })).status).toBe(400);
    expect((await stack.call(0, 'GET', '/api/v1/modules')).body.modules.loyalty).toBe(true);
  });

  it('with every module ON, none of the sample routes says module_disabled', async () => {
    for (const [key, routes] of Object.entries(ROUTES)) {
      for (const [m, p, b] of routes) {
        const r = await stack.call(0, m, p, patient, b);
        expect([key, m, p, disabled(r, key)]).toEqual([key, m, p, false]);
      }
    }
  });

  describe.each(KEYS)('module %s switched OFF', (key) => {
    beforeAll(async () => {
      const r = await setModule(0, key, false);
      expect([200, 201, 204]).toContain(r.status);
    });
    afterAll(async () => { await setModule(0, key, true); });

    it('the public read shows it off', async () => {
      expect((await stack.call(0, 'GET', '/api/v1/modules')).body.modules[key]).toBe(false);
    });

    it('its routes answer 403 module_disabled for a patient and for an anonymous visitor', async () => {
      for (const [m, p, b] of ROUTES[key]) {
        expect([m, p, disabled(await stack.call(0, m, p, patient, b), key)]).toEqual([m, p, true]);
      }
      const [m, p] = ROUTES[key][0];
      const anon = await stack.call(0, m, p);
      expect([m, p, anon.status === 401 || disabled(anon, key)]).toEqual([m, p, true]);
    });

    it('the other modules keep working', async () => {
      for (const [other, routes] of Object.entries(ROUTES)) {
        if (other === key) continue;
        const [m, p, b] = routes[0];
        expect([other, disabled(await stack.call(0, m, p, patient, b), other)]).toEqual([other, false]);
      }
    });
  });

  it('a switched-off module refuses writes before they happen (nothing is stored)', async () => {
    await setModule(0, 'mental_health', false);
    const before = await stack.db.collection('mood_entries').countDocuments({});
    const r = await stack.call(0, 'POST', '/api/v1/mental-health/mood', patient, { mood: 4, note: 'should not be stored' });
    expect(disabled(r, 'mental_health')).toBe(true);
    expect(await stack.db.collection('mood_entries').countDocuments({})).toBe(before);
    await setModule(0, 'mental_health', true);
  });

  it('admin routes of a switched-off module still work', async () => {
    await setModule(0, 'labs_radiology', false);
    const r = await stack.call(0, 'GET', '/api/v1/labs/admin/catalog', admin);
    expect(disabled(r, 'labs_radiology')).toBe(false);
    expect(r.status).toBeLessThan(500);
    await setModule(0, 'labs_radiology', true);
  });

  it('the switch reaches every instance within 5 seconds, off and back on, without a restart', async () => {
    const waitFor = async (pred: () => Promise<boolean>) => {
      const until = Date.now() + 5_000;
      while (Date.now() < until) { if (await pred()) return true; await new Promise((r) => setTimeout(r, 250)); }
      return pred();
    };
    // instance B reads (and may cache) the state first
    expect(disabled(await stack.call(1, 'GET', '/api/v1/articles', patient), 'articles')).toBe(false);
    expect((await stack.call(1, 'GET', '/api/v1/modules')).body.modules.articles).toBe(true);
    expect([200, 201, 204]).toContain((await setModule(0, 'articles', false)).status);
    expect(await waitFor(async () => disabled(await stack.call(1, 'GET', '/api/v1/articles', patient), 'articles'))).toBe(true);
    expect(await waitFor(async () => (await stack.call(1, 'GET', '/api/v1/modules')).body.modules.articles === false)).toBe(true);
    expect([200, 201, 204]).toContain((await setModule(0, 'articles', true)).status);
    expect(await waitFor(async () => !disabled(await stack.call(1, 'GET', '/api/v1/articles', patient), 'articles'))).toBe(true);
  });
});
