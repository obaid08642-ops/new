import { ProviderOpsService } from './provider-ops.module';

// PV-07: a provider answers a published review; the patient is told; a review not yet published cannot be answered.
function setup(rows: any[]) {
  const emitted: any[] = [];
  const match = (r: any, f: any): boolean => Object.entries(f).every(([k, v]) => (k === '$or' ? (v as any[]).some((o) => match(r, o)) : r[k] === v));
  const conn = { collection: () => ({
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
