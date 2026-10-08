// ACCEPTANCE — D-9 loyalty challenges are health habits only (owner decision 2026-10-06 item 9,
// issue #328; Queue C). Written by the reviewer before the work; the implementing agent makes it pass
// and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required
//   1. The admin can create or update a challenge only with a health-habit `target_action`
//      (at least `vitals_logged` and `checkup_completed` are accepted); a purchase action
//      (`order_delivered`, `order_medicine`, anything about buying medicines) is refused with 400.
//   2. Existing purchase challenges are ended and archived:
//      scripts/migrations/2026-10-end-purchase-challenges.ts (dry-run default, --apply; MONGODB_URI,
//      DB_NAME): each purchase challenge is copied to archive_loyalty_challenges (same _id,
//      archived_at), then set inactive with end_date <= now; health-habit challenges are untouched;
//      a rerun adds no duplicates.
//   3. Patients no longer see a purchase challenge (GET /loyalty/challenges). Rewards stay.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');
const DAY = 86_400_000;

describe('D-9: loyalty challenges are health habits only', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  const challenge = (target_action: string) => ({ title_ar: 'تحدي', title_en: 'Challenge', target_action, target_count: 3, reward_points: 50, start_date: new Date(Date.now() - DAY).toISOString(), end_date: new Date(Date.now() + 30 * DAY).toISOString() });
  const migrate = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-end-purchase-challenges.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      const base = { title_ar: 'قديم', title_en: 'old', target_count: 2, reward_points: 40, start_date: new Date(Date.now() - DAY), end_date: new Date(Date.now() + 30 * DAY), active: true };
      await db.collection('loyalty_challenges').insertMany([
        { ...base, id: 'ch-buy', target_action: 'order_delivered' },
        { ...base, id: 'ch-buy2', target_action: 'order_medicine' },
        { ...base, id: 'ch-vitals', target_action: 'vitals_logged' },
      ]);
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
  });
  afterAll(async () => { await stack.stop(); });

  it('a purchase challenge cannot be created', async () => {
    for (const a of ['order_delivered', 'order_medicine']) {
      expect([a, (await stack.call(0, 'POST', '/api/v1/admin/loyalty/challenges', admin, challenge(a))).status]).toEqual([a, 400]);
    }
  });
  it('health-habit challenges can be created', async () => {
    for (const a of ['vitals_logged', 'checkup_completed']) {
      expect([a, (await stack.call(0, 'POST', '/api/v1/admin/loyalty/challenges', admin, challenge(a))).status < 300]).toEqual([a, true]);
    }
  });
  it('a challenge cannot be changed into a purchase challenge', async () => {
    expect((await stack.call(0, 'PATCH', '/api/v1/admin/loyalty/challenges/ch-vitals', admin, { target_action: 'order_delivered' })).status).toBe(400);
    expect((await stack.db.collection('loyalty_challenges').findOne({ id: 'ch-vitals' }))?.target_action).toBe('vitals_logged');
  });
  it('existing purchase challenges are archived and ended (dry-run first, rerun safe)', async () => {
    expect(migrate(false).status).toBe(0);
    expect((await stack.db.collection('loyalty_challenges').findOne({ id: 'ch-buy' }))?.active).toBe(true);
    const r = migrate(true);
    expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
    for (const id of ['ch-buy', 'ch-buy2']) {
      const c: any = await stack.db.collection('loyalty_challenges').findOne({ id });
      expect([id, c?.active, new Date(c?.end_date).getTime() <= Date.now() + 1000]).toEqual([id, false, true]);
      expect(await stack.db.collection('archive_loyalty_challenges').countDocuments({ id, archived_at: { $exists: true } })).toBe(1);
    }
    expect((await stack.db.collection('loyalty_challenges').findOne({ id: 'ch-vitals' }))?.active).toBe(true);
    expect(migrate(true).status).toBe(0);
    expect(await stack.db.collection('archive_loyalty_challenges').countDocuments({})).toBe(2);
  });
  it('patients no longer see a purchase challenge', async () => {
    const r = await stack.call(0, 'GET', '/api/v1/loyalty/challenges', patient);
    expect(r.status).toBe(200);
    const s = JSON.stringify(r.body);
    expect(s).not.toMatch(/order_delivered|order_medicine/);
    expect(s).toContain('vitals_logged');
  });
});
