import { ProviderOpsService } from './provider-ops.module';

// PV-07: a provider answers a published review; the patient is told; a review not yet published cannot be answered.
function setup(rows: any[]) {
  const emitted: any[] = [];
  const match = (r: any, f: any): boolean => Object.entries(f).every(([k, v]) => (k === '$or' ? (v as any[]).some((o) => match(r, o)) : r[k] === v));
  const conn = { collection: () => ({
    find: () => ({ limit: () => ({ toArray: async () => [] }) }),
    findOne: async (f: any) => rows.find((r) => match(r, f)) ?? null,
    updateOne: async (f: any, u: any) => { const r = rows.find((x) => x._id === f._id); if (r) Object.assign(r, u.$set); },
  }) };
  return { svc: new ProviderOpsService(conn as never, { emit: (n: string, p: any) => emitted.push([n, p]) } as never), emitted };
}

describe('provider replies to a review', () => {
  it('saves the reply and tells the patient who wrote the review', async () => {
    const rows = [{ _id: 'o1', id: 'r1', provider_id: 'p1', user_id: 'pat-1', status: 'published' }];
    const { svc, emitted } = setup(rows);
    await svc.replyReview('p1', 'r1', '  شكراً لك  ');
    expect(rows[0]).toMatchObject({ reply: 'شكراً لك' });
    expect(emitted).toEqual([['rating.replied', { user_id: 'pat-1', provider_id: 'p1', rating_id: 'r1' }]]);
  });

  it.each(['pending', 'rejected'])('refuses a %s review', async (status) => {
    const { svc, emitted } = setup([{ _id: 'o1', id: 'r1', provider_id: 'p1', user_id: 'pat-1', status }]);
    await expect(svc.replyReview('p1', 'r1', 'x')).rejects.toThrow('review_not_published');
    expect(emitted).toHaveLength(0);
  });

  it('refuses another provider\'s review, an empty reply and a very long one', async () => {
    const { svc } = setup([{ _id: 'o1', id: 'r1', provider_id: 'p1', status: 'published' }]);
    await expect(svc.replyReview('p2', 'r1', 'x')).rejects.toThrow('review not found');
    await expect(svc.replyReview('p1', 'r1', '   ')).rejects.toThrow('reply required');
    await expect(svc.replyReview('p1', 'r1', 'x'.repeat(1001))).rejects.toThrow('too long');
  });
});

// A review the patient wrote in the app is stored in `reviews` (POST /patient-ux/review), not in `ratings`.
function setupTwo(ratings: any[], reviews: any[], profiles: any[] = []) {
  const emitted: any[] = [];
  const get = (f: any, k: string) => (f[k] && typeof f[k] === 'object' && '$eq' in f[k] ? f[k].$eq : f[k]);
  const table = (name: string) => (name === 'reviews' ? reviews : ratings);
  const inIds = (f: any, id: string) => { const v = f.provider_id; return v && typeof v === 'object' && '$in' in v ? v.$in.includes(id) : id === get(f, 'provider_id'); };
  const conn = { collection: (name: string) => ({
    find: (f: any) => ({ sort: () => ({ limit: () => ({ toArray: async () => (name === 'provider_profiles' ? profiles : table(name).filter((r) => (name === 'reviews' ? inIds(f, r.provider_id) : r.provider_id === 'p1'))) }) }), limit: () => ({ toArray: async () => profiles }) }),
    findOne: async (f: any) => table(name).find((r) => r.id === get(f, 'id') && (name !== 'reviews' || inIds(f, r.provider_id))) ?? null,
    updateOne: async (f: any, u: any) => { const r = table(name).find((x) => x._id === f._id); if (r) Object.assign(r, u.$set); },
  }) };
  return { svc: new ProviderOpsService(conn as never, { emit: (n: string, p: any) => emitted.push([n, p]) } as never), emitted };
}

describe('the provider sees and answers the reviews patients write in the app', () => {
  const review = (over: any = {}) => ({ _id: 'x1', id: 'rv1', provider_id: 'p1', patient_id: 'pat-1', rating: 5, comment: 'طبيب ممتاز', status: 'approved', createdAt: new Date('2026-11-01'), booking_kind: 'consultation', booking_id: 'a1', ...over });

  it('lists them next to the ratings, in the ratings shape', async () => {
    const { svc } = setupTwo([{ _id: 'o1', id: 'r1', provider_id: 'p1', score: 4, createdAt: new Date('2026-10-01'), status: 'published' }], [review(), review({ _id: 'x2', id: 'rv2', status: 'pending_review', rating: 2 })]);
    const rows = await svc.providerReviews('p1');
    expect(rows).toHaveLength(3);
    const first = rows.find((r: any) => r.id === 'rv1');
    expect(first).toMatchObject({ score: 5, comment: 'طبيب ممتاز', status: 'published', reply: null, source: 'review' });
    expect(rows.find((r: any) => r.id === 'rv2')).toMatchObject({ score: 2, status: 'pending' });
    expect(rows.find((r: any) => r.id === 'r1')).toMatchObject({ score: 4 });
    expect(rows[0].id).not.toBe('r1');   // newest first
  });

  it('answers an approved review and tells the patient', async () => {
    const reviews = [review()];
    const { svc, emitted } = setupTwo([], reviews);
    await svc.replyReview('p1', 'rv1', ' شكراً ');
    expect(reviews[0]).toMatchObject({ reply: 'شكراً' });
    expect((reviews[0] as any).reply_at).toBeInstanceOf(Date);
    expect(emitted).toEqual([['rating.replied', { user_id: 'pat-1', provider_id: 'p1', rating_id: 'rv1' }]]);
  });

  it('does not answer a review waiting for a moderator, or another doctor\'s review', async () => {
    const { svc, emitted } = setupTwo([], [review({ status: 'pending_review' })]);
    await expect(svc.replyReview('p1', 'rv1', 'x')).rejects.toThrow('review_not_published');
    await expect(svc.replyReview('p2', 'rv1', 'x')).rejects.toThrow('review not found');
    expect(emitted).toHaveLength(0);
  });

  it('finds a consultation review that carries the doctor\'s profile id, for the doctor who signs in with the account id', async () => {
    const reviews = [review({ provider_id: 'profile-9' })];
    const { svc } = setupTwo([], reviews, [{ id: 'profile-9' }]);
    expect((await svc.providerReviews('acct-1')).map((r: any) => r.id)).toEqual(['rv1']);
    await svc.replyReview('acct-1', 'rv1', 'شكراً');
    expect(reviews[0]).toMatchObject({ reply: 'شكراً' });
    const none = setupTwo([], [review({ provider_id: 'profile-9' })], []);
    expect(await none.svc.providerReviews('acct-1')).toEqual([]);
  });
});
