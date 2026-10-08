/**
 * Phase 22.13 C6.1 / P22.1.2: store-review reply outbox.
 * Replies are durable-queued (never fake-sent); double replies are blocked;
 * retry re-attempts without flipping to `sent` (only provider confirmation can).
 */
import { ReleaseService, REVIEW_REPLY_MAX_LENGTH } from './release.service';

function chain(result: any) {
  const c: any = {};
  c.sort = jest.fn(() => c);
  c.limit = jest.fn(() => c);
  c.lean = jest.fn(() => c);
  c.exec = jest.fn(async () => result);
  return c;
}

function buildSvc() {
  const store = new Map<string, any>();
  const reviewModel: any = {
    findById: jest.fn(async (id: string) => store.get(id) || null),
    find: jest.fn((q: any) => {
      const rows = [...store.values()].filter((r) => {
        if (q?.reply_status?.$in && !q.reply_status.$in.includes(r.reply_status)) return false;
        if (q?.app && r.app !== q.app) return false;
        if (q?.platform && r.platform !== q.platform) return false;
        return true;
      });
      return chain(rows);
    }),
    countDocuments: jest.fn((q: any) => {
      const n = [...store.values()].filter((r) => {
        if (q?.reply_status?.$in && !q.reply_status.$in.includes(r.reply_status)) return false;
        return true;
      }).length;
      return { exec: jest.fn(async () => n) };
    }),
  };
  const seed = (doc: any) => {
    const d: any = { reply_attempts: 0, ...doc };
    d.save = jest.fn(async () => d);
    store.set(doc._id, d);
    return d;
  };
  const svc = new ReleaseService({} as any, {} as any, reviewModel, {} as any, {} as any);
  return { svc, seed, reviewModel };
}

const review = (over: any = {}) => ({
  _id: 'r1',
  app: 'patient-app',
  platform: 'ios',
  review_id: 'rev-1',
  rating: 2,
  content: 'App crashes on login',
  author: 'user1',
  version: '2.4.0',
  replied: false,
  fetched_at: new Date(),
  ...over,
});

describe('ReleaseService store-review reply outbox (P22.1.2 / C6.1)', () => {
  const ENV = { ...process.env };
  beforeEach(() => {
    delete process.env.APP_STORE_CONNECT_KEY_ID;
    delete process.env.APP_STORE_CONNECT_ISSUER_ID;
    delete process.env.PLAY_SERVICE_ACCOUNT_JSON;
  });
  afterAll(() => {
    process.env = ENV;
  });

  it('queues a submitted reply (never marks sent)', async () => {
    const { svc, seed } = buildSvc();
    seed(review());
    const out = await svc.submitReviewReply('r1', 'Sorry for the trouble, please update.', 'admin1');
    expect(out.reply_status).toBe('queued');
    expect(out.reply_content).toBe('Sorry for the trouble, please update.');
    expect(out.replied_by).toBe('admin1');
    expect(out.replied).not.toBe(true);
    expect(out.reply_attempts).toBeGreaterThanOrEqual(1);
  });

  it('blocks a double reply while one is queued', async () => {
    const { svc, seed } = buildSvc();
    seed(review());
    await svc.submitReviewReply('r1', 'First reply', 'admin1');
    await expect(svc.submitReviewReply('r1', 'Second reply', 'admin1'))
      .rejects.toThrow('reply_already_queued');
  });

  it('blocks a new reply once the provider confirmed sent', async () => {
    const { svc, seed } = buildSvc();
    seed(review());
    await svc.submitReviewReply('r1', 'First reply', 'admin1');
    await svc.confirmProviderReplySent('r1');
    await expect(svc.submitReviewReply('r1', 'Another reply', 'admin1'))
      .rejects.toThrow('already_replied');
  });

  it('rejects empty and oversized reply bodies', async () => {
    const { svc, seed } = buildSvc();
    seed(review());
    expect(REVIEW_REPLY_MAX_LENGTH).toBe(1000);
    await expect(svc.submitReviewReply('r1', '   ', 'admin1')).rejects.toThrow('reply_content_required');
    await expect(svc.submitReviewReply('r1', 'x'.repeat(1001), 'admin1'))
      .rejects.toThrow(/exceeds_1000_chars/);
  });

  it('listPendingReviews returns only queued/failed outbox depth', async () => {
    const { svc, seed } = buildSvc();
    seed(review({ _id: 'a', review_id: 'a', reply_status: 'queued', reply_content: 'r' }));
    seed(review({ _id: 'b', review_id: 'b', reply_status: 'failed', reply_content: 'r' }));
    seed(review({ _id: 'c', review_id: 'c', reply_status: 'sent', replied: true, reply_content: 'r' }));
    seed(review({ _id: 'd', review_id: 'd' }));
    const pending = await svc.listPendingReviews();
    expect(pending.map((r: any) => r._id).sort()).toEqual(['a', 'b']);
  });

  it('retry re-attempts queued items and keeps them queued without credentials', async () => {
    const { svc, seed } = buildSvc();
    const d = seed(review({ reply_status: 'queued', reply_content: 'r', reply_attempts: 1 }));
    const res = await svc.retryReplyQueue(10);
    expect(res.attempted).toBe(1);
    expect(res.still_queued).toBe(1);
    expect(d.reply_attempts).toBe(2);
    expect(d.reply_status).toBe('queued');
    expect(d.reply_error).toMatch(/awaiting_credentials/);
  });

  it('with credentials present the stub still never fake-sends (BLOCKED, stays queued)', async () => {
    process.env.APP_STORE_CONNECT_KEY_ID = 'key1';
    process.env.APP_STORE_CONNECT_ISSUER_ID = 'iss1';
    const { svc, seed } = buildSvc();
    const d = seed(review());
    await svc.submitReviewReply('r1', 'Thanks for the feedback.', 'admin1');
    expect(d.reply_status).toBe('queued');
    expect(d.replied).not.toBe(true);
    expect(d.reply_error).toMatch(/BLOCKED/);
  });

  it('only provider confirmation flips a reply to sent', async () => {
    const { svc, seed } = buildSvc();
    seed(review({ reply_status: 'queued', reply_content: 'r' }));
    const out = await svc.confirmProviderReplySent('r1');
    expect(out.reply_status).toBe('sent');
    expect(out.replied).toBe(true);
    expect(out.provider_synced_at).toBeInstanceOf(Date);
  });
});
