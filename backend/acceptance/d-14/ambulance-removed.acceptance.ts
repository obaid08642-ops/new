// ACCEPTANCE — D-14 remove the whole ambulance system (owner decision 2026-10-06 item 14, answer O-2;
// issue #333; Queue C). Written by the reviewer before the work; the implementing agent makes it
// pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required behaviour:
//   1. Gone (404 for every caller, even an admin): emergency trigger / dispatch / missions / claim /
//      tracking / assign / escalate / resolve, the provider and admin ambulance fleet, and the whole
//      `drivers` module.
//   2. The ambulance provider type no longer exists: registration and onboarding refuse it (400);
//      the six other provider types still register.
//   3. Kept and built: "send my location to my emergency contacts",
//      POST /api/v1/emergency/share-location { lat, lng } (signed-in patient):
//        - every emergency contact who is an app user (contact phone == users.phone) gets an in-app
//          notification (notifications collection, user_id = that user) carrying a map link with the
//          coordinates;
//        - every other contact comes back in `sms_links[]` as { name, phone, href } where href is an
//          `sms:` link holding the same map link, for the patient's phone to send;
//        - no emergency request, no dispatch and no admin alert are created;
//        - lat/lng validated (400), anonymous 401, at most 5 calls per patient per 10 minutes (429).
//      The 997 dial button is client-only and not tested here.
//   4. Data is archived, not dropped silently: scripts/migrations/2026-10-archive-ambulance.ts
//      (repo convention: dry-run by default, `--apply` writes; MONGODB_URI and DB_NAME):
//        - dry-run changes nothing;
//        - --apply copies every document of emergency_requests, ambulance_vehicles and drivershifts,
//          and the ambulance rows of provider_accounts and provider_profiles, into
//          archive_<collection> (same _id, plus `archived_at`), then removes them from the live
//          collections; other provider types are untouched;
//        - running --apply again adds no duplicates.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');
const GONE: Array<[string, string]> = [
  ['POST', '/api/v1/emergency/trigger'], ['GET', '/api/v1/emergency/my/active'], ['POST', '/api/v1/emergency/e-1/cancel'],
  ['GET', '/api/v1/emergency/driver/missions'], ['POST', '/api/v1/emergency/e-1/claim'], ['GET', '/api/v1/emergency/tracking'],
  ['POST', '/api/v1/emergency/e-1/track'], ['GET', '/api/v1/emergency/active'], ['GET', '/api/v1/emergency/e-1'],
  ['POST', '/api/v1/emergency/e-1/assign'], ['POST', '/api/v1/emergency/e-1/escalate-997'], ['POST', '/api/v1/emergency/e-1/auto-dispatch'],
  ['POST', '/api/v1/emergency/e-1/resolve'], ['POST', '/api/v1/emergency/e-1/dispatch'],
  ['GET', '/api/v1/provider/ambulance/fleet'], ['POST', '/api/v1/provider/ambulance/fleet'],
  ['GET', '/api/v1/admin/ambulance/fleet'], ['POST', '/api/v1/admin/ambulance/fleet/v-1/approve'],
  ['POST', '/api/v1/drivers/online'], ['GET', '/api/v1/drivers/shift'], ['POST', '/api/v1/drivers/location'],
  ['GET', '/api/v1/drivers/orders/available'], ['POST', '/api/v1/drivers/orders/o-1/accept'], ['GET', '/api/v1/drivers/available'],
  ['GET', '/api/v1/drivers/admin/online'],
];
const OTHER_TYPES = ['doctor', 'pharmacy', 'laboratory', 'radiology', 'home_care', 'hospital'];

describe('D-14: the ambulance system is removed; "share my location" stays', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const runMigration = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-archive-ambulance.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1);
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
    // the patient's emergency contacts: one is an app user, one is only a phone number
    await stack.db.collection('users').insertOne({ id: 'pat-sister', full_name: 'Sister', role: 'patient', active: true, phone: '+966500000111' });
    await stack.db.collection('patient_profiles').updateOne({ user_id: 'pat-1' }, {
      $set: { user_id: 'pat-1', emergency_contacts: [
        { id: 'c1', name: 'Sister', phone: '+966500000111', relation: 'sister', isPrimary: true },
        { id: 'c2', name: 'Neighbour', phone: '+966500000222', relation: 'neighbour' },
      ] },
    }, { upsert: true });
  });
  afterAll(async () => { await stack.stop(); });

  it('every ambulance, dispatch, tracking and driver route is gone (404), also for an admin', async () => {
    const still: string[] = [];
    for (const [m, p] of GONE) {
      for (const token of [patient, admin]) {
        const r = await stack.call(0, m, p, token, m === 'GET' ? undefined : {});
        if (r.status !== 404) still.push(`${m} ${p} -> ${r.status}`);
      }
    }
    expect(still).toEqual([]);
  });

  it('the ambulance provider type cannot register or onboard; the other six still can', async () => {
    const reg = (type: string, n: string) => stack.call(0, 'POST', '/api/v1/provider/auth/register', undefined,
      { email: `p-${n}@example.test`, password: 'Aa1!aaaaaaaa', confirm_password: 'Aa1!aaaaaaaa', provider_type: type });
    expect((await reg('ambulance', 'amb')).status).toBe(400);
    expect(await stack.db.collection('provider_accounts').findOne({ email: 'p-amb@example.test' })).toBeNull();
    const onboard = await stack.call(0, 'POST', '/api/v1/provider-onboarding/start', undefined,
      { phone: '+966500000333', password: 'Aa1!aaaaaaaa', full_name: 'Amb Co', email: 'amb2@example.test', type: 'ambulance' });
    expect(onboard.status).toBe(400);
    // control: the six remaining types are accepted (the account is created; the e-mail step may answer
    // 503 in this environment because no mail channel is configured, which is not a type refusal)
    for (const t of OTHER_TYPES) {
      const r = await reg(t, t);
      expect([t, r.status === 400]).toEqual([t, false]);
      expect([t, !!(await stack.db.collection('provider_accounts').findOne({ email: `p-${t}@example.test`, provider_type: t }))]).toEqual([t, true]);
    }
  });

  describe('share my location with my emergency contacts', () => {
    let res: { status: number; body: any };
    let adminAlertsBefore = 0;
    let requestsBefore = 0;
    beforeAll(async () => {
      requestsBefore = await stack.db.collection('emergency_requests').countDocuments({});
      adminAlertsBefore = await stack.db.collection('notifications').countDocuments({ role: 'admin', type: 'emergency' });
      res = await stack.call(0, 'POST', '/api/v1/emergency/share-location', patient, { lat: 21.5433, lng: 39.1728 });
    });

    it('creates no emergency request (no dispatch)', async () => {
      expect(await stack.db.collection('emergency_requests').countDocuments({})).toBe(requestsBefore);
    });

    it('answers 2xx', () => { expect(res.status).toBeLessThan(300); });

    it('the contact who uses the app gets an in-app notification with the map link', async () => {
      const n = await stack.db.collection('notifications').findOne({ user_id: 'pat-sister' });
      expect(n).toBeTruthy();
      expect(JSON.stringify(n)).toMatch(/21\.5433/);
      expect(JSON.stringify(n)).toMatch(/39\.1728/);
    });

    it('the other contact comes back as an sms: link with the same map link', () => {
      const links: any[] = res.body?.sms_links || [];
      const neighbour = links.find((l) => l.phone === '+966500000222');
      expect(neighbour).toBeTruthy();
      expect(String(neighbour.href)).toMatch(/^sms:/);
      expect(decodeURIComponent(String(neighbour.href))).toMatch(/21\.5433.*39\.1728|39\.1728.*21\.5433/);
      expect(links.find((l) => l.phone === '+966500000111')).toBeUndefined();
    });

    it('no admin emergency alert is created', async () => {
      expect(await stack.db.collection('notifications').countDocuments({ role: 'admin', type: 'emergency' })).toBe(adminAlertsBefore);
    });

    it('validates input, needs a sign-in, and is rate limited', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/emergency/share-location', patient, { lat: 200, lng: 39 })).status).toBe(400);
      expect((await stack.call(0, 'POST', '/api/v1/emergency/share-location', undefined, { lat: 21.5, lng: 39.1 })).status).toBe(401);
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) statuses.push((await stack.call(0, 'POST', '/api/v1/emergency/share-location', patient, { lat: 21.5, lng: 39.1 })).status);
      expect(statuses).toContain(429);
    });
  });

  describe('the data is archived before it leaves', () => {
    const live = ['emergency_requests', 'ambulance_vehicles', 'drivershifts'];
    beforeAll(async () => {
      const db = stack.db;
      await db.collection('emergency_requests').deleteMany({});
      await db.collection('emergency_requests').insertMany([{ id: 'e-1', patient_id: 'pat-1', state: 'RESOLVED' }, { id: 'e-2', patient_id: 'pat-2', state: 'CANCELLED' }]);
      await db.collection('ambulance_vehicles').insertOne({ id: 'v-1', plate: 'ABC 123', provider_account_id: 'amb-acc' });
      await db.collection('drivershifts').insertOne({ driver_id: 'drv-1', started_at: new Date() });
      await db.collection('provider_accounts').insertMany([{ id: 'amb-acc', email: 'amb-acc@example.test', provider_type: 'ambulance', status: 'approved' }, { id: 'ph-acc', email: 'ph-acc@example.test', provider_type: 'pharmacy', status: 'approved' }]);
      await db.collection('provider_profiles').insertMany([{ id: 'amb-prof', account_id: 'amb-acc', type: 'ambulance', provider_type: 'ambulance' }, { id: 'ph-prof', account_id: 'ph-acc', type: 'pharmacy', provider_type: 'pharmacy' }]);
    });

    it('dry-run changes nothing', async () => {
      const r = runMigration(false);
      expect([r.status, r.stderr.slice(-500)]).toEqual([0, expect.anything()]);
      for (const c of live) expect(await stack.db.collection(c).countDocuments({})).toBeGreaterThan(0);
      expect(await stack.db.collection('archive_emergency_requests').countDocuments({})).toBe(0);
    });

    it('--apply archives every row (same _id, archived_at) and empties the live collections', async () => {
      const ids = await stack.db.collection('emergency_requests').find({}).map((d: any) => String(d._id)).toArray();
      const r = runMigration(true);
      expect([r.status, r.stderr.slice(-500)]).toEqual([0, expect.anything()]);
      for (const c of live) {
        expect([c, await stack.db.collection(c).countDocuments({})]).toEqual([c, 0]);
        expect([c, (await stack.db.collection(`archive_${c}`).countDocuments({})) > 0]).toEqual([c, true]);
      }
      const archived = await stack.db.collection('archive_emergency_requests').find({}).toArray();
      expect(archived.map((d: any) => String(d._id)).sort()).toEqual(ids.sort());
      for (const d of archived) expect(d.archived_at).toBeTruthy();
    });

    it('ambulance providers are archived and removed; other providers are untouched', async () => {
      expect(await stack.db.collection('provider_accounts').findOne({ id: 'amb-acc' })).toBeNull();
      expect(await stack.db.collection('provider_profiles').findOne({ id: 'amb-prof' })).toBeNull();
      expect(await stack.db.collection('archive_provider_accounts').findOne({ id: 'amb-acc' })).toBeTruthy();
      expect(await stack.db.collection('archive_provider_profiles').findOne({ id: 'amb-prof' })).toBeTruthy();
      expect(await stack.db.collection('provider_accounts').findOne({ id: 'ph-acc' })).toBeTruthy();
      expect(await stack.db.collection('provider_profiles').findOne({ id: 'ph-prof' })).toBeTruthy();
    });

    it('running --apply again adds no duplicates', async () => {
      const before = await stack.db.collection('archive_emergency_requests').countDocuments({});
      expect(runMigration(true).status).toBe(0);
      expect(await stack.db.collection('archive_emergency_requests').countDocuments({})).toBe(before);
    });
  });
});
