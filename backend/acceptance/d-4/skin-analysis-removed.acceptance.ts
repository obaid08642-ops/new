// ACCEPTANCE — D-4 remove AI skin analysis (owner decision 2026-10-06 item 4, issue #323; Queue C).
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it
// (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
// Required:
//   - POST /api/v1/ai/skin-analysis is gone (404) for every caller; other AI routes keep working.
//   - The stored self-checks (`ai_skin_self_checks`, health data) are archived before they leave:
//     scripts/migrations/2026-10-archive-skin-checks.ts (dry-run default, --apply writes; MONGODB_URI,
//     DB_NAME) copies every row to `archive_ai_skin_self_checks` (same _id, archived_at), then empties
//     the live collection; a rerun adds no duplicates.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');

describe('D-4: AI skin analysis is removed', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const migrate = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-archive-skin-checks.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('ai_skin_self_checks').insertMany([
        { patient_id: 'pat-1', changes: ['itching'], care_level: 'consultation', createdAt: new Date() },
        { patient_id: 'pat-2', changes: ['bleeding'], care_level: 'clinician', createdAt: new Date() },
      ]);
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
  });
  afterAll(async () => { await stack.stop(); });

  it('POST /ai/skin-analysis answers 404 for a patient and an admin', async () => {
    for (const token of [patient, admin]) {
      const r = await stack.call(0, 'POST', '/api/v1/ai/skin-analysis', token, { acknowledge_limitations: true, area: 'arm', changes: ['itching'] });
      expect(r.status).toBe(404);
    }
  });

  it('control: another AI route still answers (not 404)', async () => {
    const r = await stack.call(0, 'GET', '/api/v1/ai/triage/history', patient);
    expect(r.status).not.toBe(404);
  });

  it('dry-run changes nothing', async () => {
    const r = migrate(false);
    expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
    expect(await stack.db.collection('ai_skin_self_checks').countDocuments({})).toBe(2);
  });

  it('--apply archives every self-check (same _id, archived_at) and empties the live collection; a rerun adds nothing', async () => {
    const ids = (await stack.db.collection('ai_skin_self_checks').find({}).toArray()).map((d: any) => String(d._id)).sort();
    expect(migrate(true).status).toBe(0);
    expect(await stack.db.collection('ai_skin_self_checks').countDocuments({})).toBe(0);
    const archived = await stack.db.collection('archive_ai_skin_self_checks').find({}).toArray();
    expect(archived.map((d: any) => String(d._id)).sort()).toEqual(ids);
    for (const d of archived) expect(d.archived_at).toBeTruthy();
    expect(migrate(true).status).toBe(0);
    expect(await stack.db.collection('archive_ai_skin_self_checks').countDocuments({})).toBe(2);
  });
});
