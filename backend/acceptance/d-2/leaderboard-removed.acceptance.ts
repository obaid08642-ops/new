// ACCEPTANCE — D-2 remove the loyalty leaderboard (owner decision 2026-10-06 item 2, issue #321;
// Queue C). Written by the reviewer before the work; the implementing agent makes it pass and may not
// edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
// Required: GET /api/v1/loyalty/leaderboard is gone (404) for every caller; the rest of loyalty
// (account, transactions, challenges, rewards) keeps working. The leaderboard is computed, so there is
// no data to archive; its screens and translations are the design session's.
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

describe('D-2: the loyalty leaderboard is removed', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('loyalty_accounts').insertMany([
        { user_id: 'pat-1', points: 120, lifetime_points: 120, tier: 'bronze' },
        { user_id: 'pat-2', points: 900, lifetime_points: 900, tier: 'gold', display_name: 'Someone Else' },
      ]);
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
  });
  afterAll(async () => { await stack.stop(); });

  it('GET /loyalty/leaderboard answers 404 for a patient, an admin and an anonymous caller', async () => {
    for (const token of [patient, admin, undefined]) {
      const r = await stack.call(0, 'GET', '/api/v1/loyalty/leaderboard', token);
      expect(r.status).toBe(404);
    }
  });

  it('no other patient\'s points or name are exposed by any loyalty read', async () => {
    for (const p of ['/api/v1/loyalty/account', '/api/v1/loyalty/transactions', '/api/v1/loyalty/challenges', '/api/v1/loyalty/rewards']) {
      const r = await stack.call(0, 'GET', p, patient);
      expect([p, JSON.stringify(r.body).includes('Someone Else'), JSON.stringify(r.body).includes('pat-2')]).toEqual([p, false, false]);
    }
  });

  it('control: the rest of loyalty keeps working', async () => {
    for (const p of ['/api/v1/loyalty/account', '/api/v1/loyalty/transactions', '/api/v1/loyalty/challenges', '/api/v1/loyalty/rewards']) {
      expect([p, (await stack.call(0, 'GET', p, patient)).status]).toEqual([p, 200]);
    }
  });
});
