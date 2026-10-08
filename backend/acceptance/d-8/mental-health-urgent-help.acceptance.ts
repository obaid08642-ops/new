// ACCEPTANCE — D-8 mental health: no self-assessment, no in-app crisis handling; one "Need urgent
// help?" number from admin config (owner decision 2026-10-06 item 8, issue #327; Queue C). Written by
// the reviewer before the work; the implementing agent makes it pass and may not edit it (nor
// live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required
//   1. Gone (404): GET /mental-health/assessment-questions and every crisis-contacts route.
//      The stored crisis contacts are archived first: scripts/migrations/2026-10-archive-crisis-contacts.ts
//      (dry-run default, --apply; MONGODB_URI, DB_NAME) -> archive_crisis_contacts (same _id,
//      archived_at), live collection emptied, rerun adds nothing.
//   2. The urgent-help number comes from admin config, never from code:
//      PUT /api/v1/admin/mental-health/urgent-help { phone } (admin only, must be a dialable number,
//      else 400); GET /api/v1/mental-health/urgent-help (public) -> { phone } — `phone: null` until the
//      admin sets it.
//   3. Kept: mood journal, meditation, breathing (control).
import { spawnSync } from 'child_process';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');

describe('D-8: mental health keeps the calm parts and one admin-set urgent-help number', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const migrate = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-archive-crisis-contacts.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('crisis_contacts').insertMany([
        { id: 'cc-1', patient_id: 'pat-1', contact_name: 'Brother', phone: '+966500000123', relationship: 'brother' },
        { id: 'cc-2', patient_id: 'pat-2', contact_name: 'Friend', phone: '+966500000456' },
      ]);
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
  });
  afterAll(async () => { await stack.stop(); });

  it.each([
    ['GET', '/api/v1/mental-health/assessment-questions?type=phq9'],
    ['GET', '/api/v1/mental-health/assessment-questions?type=gad7'],
    ['GET', '/api/v1/mental-health/crisis-contacts'],
    ['POST', '/api/v1/mental-health/crisis-contacts'],
    ['DELETE', '/api/v1/mental-health/crisis-contacts/cc-1'],
  ])('%s %s -> 404', async (m, p) => {
    expect((await stack.call(0, m, p, patient, m === 'POST' ? { contact_name: 'X', phone: '+966500000789' } : undefined)).status).toBe(404);
  });

  it('the stored crisis contacts are archived first', async () => {
    expect(migrate(false).status).toBe(0);
    expect(await stack.db.collection('crisis_contacts').countDocuments({})).toBe(2);
    const r = migrate(true);
    expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
    expect(await stack.db.collection('crisis_contacts').countDocuments({})).toBe(0);
    expect(await stack.db.collection('archive_crisis_contacts').countDocuments({ archived_at: { $exists: true } })).toBe(2);
    expect(migrate(true).status).toBe(0);
    expect(await stack.db.collection('archive_crisis_contacts').countDocuments({})).toBe(2);
  });

  describe('the urgent-help number', () => {
    it('is public and null until the admin sets it (never hard-coded)', async () => {
      const r = await stack.call(0, 'GET', '/api/v1/mental-health/urgent-help');
      expect(r.status).toBe(200);
      expect(r.body).toEqual(expect.objectContaining({ phone: null }));
    });
    it('only an admin sets it, and it must be a dialable number', async () => {
      expect((await stack.call(0, 'PUT', '/api/v1/admin/mental-health/urgent-help', patient, { phone: '920033360' })).status).toBe(403);
      expect((await stack.call(0, 'PUT', '/api/v1/admin/mental-health/urgent-help', admin, { phone: 'call us' })).status).toBe(400);
      expect((await stack.call(0, 'PUT', '/api/v1/admin/mental-health/urgent-help', admin, { phone: '920033360' })).status).toBeLessThan(300);
      expect((await stack.call(0, 'GET', '/api/v1/mental-health/urgent-help')).body?.phone).toBe('920033360');
    });
  });

  it('control: mood journal, meditation and breathing keep working', async () => {
    for (const p of ['/api/v1/mental-health/mood', '/api/v1/mental-health/meditation', '/api/v1/mental-health/breathing']) {
      expect([p, (await stack.call(0, 'GET', p, patient)).status]).toEqual([p, 200]);
    }
  });
});
