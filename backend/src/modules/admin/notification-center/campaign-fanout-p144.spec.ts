import { AdminNotificationCenterService } from './admin-notification-center.module';

// P14.4: a campaign is claimed by the request and queued by the worker a page at a time, with no audience cap.
function fakeDb(userCount: number) {
  const users = Array.from({ length: userCount }, (_, i) => ({ id: `u${String(i).padStart(7, '0')}`, role: i % 10 === 0 ? 'doctor' : 'patient' }));
  const campaigns: any[] = [];
  const match = (doc: any, q: any): boolean => Object.entries(q).every(([k, v]: [string, any]) => {
    const val = k.split('.').reduce((o: any, p) => (o == null ? undefined : o[p]), doc);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('$in' in v) return v.$in.includes(val);
      if ('$exists' in v) return (val !== undefined) === v.$exists;
      if ('$gt' in v) return val > v.$gt;
      if ('$lt' in v) return val < v.$lt;
    }
    return val === v;
  });
  const set = (doc: any, path: string, val: any) => { const ks = path.split('.'); let o = doc; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks[ks.length - 1]] = val; };
  const apply = (doc: any, u: any) => {
    for (const [k, v] of Object.entries(u.$set || {})) set(doc, k, v);
    for (const [k, v] of Object.entries(u.$inc || {})) set(doc, k, (k.split('.').reduce((o: any, p) => o?.[p], doc) || 0) + (v as number));
  };
  const usersCol = {
    find: (q: any) => {
      let rows = users.filter((u) => match(u, q));
      const cur: any = { sort: () => cur, limit: (n: number) => { rows = rows.sort((a, b) => a.id.localeCompare(b.id)).slice(0, n); return cur; }, toArray: async () => rows.map((u) => ({ id: u.id })) };
      return cur;
    },
    countDocuments: async (q: any) => users.filter((u) => match(u, q)).length,
    findOne: async (q: any) => users.find((u) => match(u, q)) || null,
  };
  const campaignsCol = {
    findOne: async (q: any) => campaigns.find((c) => match(c, q)) || null,
    insertOne: async (d: any) => { campaigns.push(d); },
    updateOne: async (q: any, u: any) => { const c = campaigns.find((x) => match(x, q)); if (c) apply(c, u); return { matchedCount: c ? 1 : 0, modifiedCount: c ? 1 : 0 }; },
    findOneAndUpdate: async (q: any, u: any) => { const c = campaigns.find((x) => match(x, q)); if (c) apply(c, u); return c || null; },
  };
  const conn: any = { collection: (n: string) => (n === 'users' ? usersCol : n === 'campaigns' ? campaignsCol : { findOne: async () => null }) };
  return { conn, campaigns };
}

describe('campaign fan-out (P14.4)', () => {
  it('the request only claims and counts; the worker queues 100,000 patients in pages, no cap, each user once', async () => {
    const { conn, campaigns } = fakeDb(111_112); // 100,000 patients + doctors: past the old 100k cap
    const pages: any[][] = [];
    const push: any = { queueNotifications: jest.fn(async (items: any[]) => { pages.push(items); }) };
    const svc = new AdminNotificationCenterService(conn, push);
    campaigns.push({ id: 'c1', status: 'draft', segment: 'patients', title: 'T', body: 'B', variants: [{ id: 'A', title: 'TA', body: 'BA' }, { id: 'B', title: 'TB', body: 'BB' }] });

    const r = await svc.sendCampaign('c1');
    expect(r).toEqual({ ok: true, status: 'sending', targeted: 100_000 });
    expect(push.queueNotifications).not.toHaveBeenCalled();
    expect(await svc.sendCampaign('c1')).toEqual({ ok: false, reason: 'already_sending' });

    await svc.runFanouts();
    const all = pages.flat();
    expect(all).toHaveLength(100_000);
    expect(new Set(all.map((x) => x.jobId)).size).toBe(100_000);
    expect(pages.every((p) => p.length <= 1000)).toBe(true);
    expect(campaigns[0].status).toBe('sent');
    expect(campaigns[0].stats.sent).toBe(100_000);
    expect(campaigns[0].stats.variants.A + campaigns[0].stats.variants.B).toBe(100_000);
  });

  it('a fan-out error keeps the saved pages; after the lease the next run continues from them, each user queued once', async () => {
    const { conn, campaigns } = fakeDb(3_500);
    let calls = 0;
    const queued: any[] = [];
    const push: any = { queueNotifications: jest.fn(async (items: any[]) => { if (++calls === 3) throw new Error('redis down'); queued.push(...items); }) };
    const svc = new AdminNotificationCenterService(conn, push);
    campaigns.push({ id: 'c2', status: 'scheduled', segment: 'all', title: 'T', body: 'B' });
    await svc.sendCampaign('c2');
    await svc.runFanouts();
    expect(campaigns[0].status).toBe('sending');
    expect(campaigns[0].stats.sent).toBe(2000);
    expect(campaigns[0].fanout.errors).toBe(1);
    await svc.runFanouts(); // still inside the lease: nothing happens
    expect(queued).toHaveLength(2000);
    campaigns[0].fanout.lease_until = new Date(0); // the lease ran out
    await svc.runFanouts();
    expect(campaigns[0].status).toBe('sent');
    expect(campaigns[0].stats.sent).toBe(3500);
    expect(new Set(queued.map((x) => x.userId)).size).toBe(3500);
    expect(queued).toHaveLength(3500);
  });

  it('an error that keeps coming back fails the campaign after five tries', async () => {
    const { conn, campaigns } = fakeDb(10);
    const push: any = { queueNotifications: jest.fn(async () => { throw new Error('redis down'); }) };
    const svc = new AdminNotificationCenterService(conn, push);
    campaigns.push({ id: 'c3', status: 'draft', segment: 'all', title: 'T', body: 'B' });
    await svc.sendCampaign('c3');
    for (let i = 0; i < 5; i++) { campaigns[0].fanout.lease_until = new Date(0); await svc.runFanouts(); }
    expect(campaigns[0].status).toBe('failed');
    expect(campaigns[0].last_error).toBe('redis down');
  });
});
