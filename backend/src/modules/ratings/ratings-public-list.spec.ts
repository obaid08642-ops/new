import { RatingsService } from './ratings.module';

/** A public review list shows score, comment, date and the reviewer's first name: never the account or the visit. */
describe('public provider reviews', () => {
  it('returns only the allow-listed fields', async () => {
    const row = { score: 4, comment: 'Good', createdAt: new Date('2026-10-02'), user_name: 'Omar Khalid Saleh', user_id: 'u-9', entity_id: 'appt-3', entity_type: 'appointment', provider_id: 'p1' };
    let projection: any;
    const ratings: any = {
      find: (_q: any, opts: any) => { projection = opts?.projection; return { sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => [row] }) }) }) }; },
      countDocuments: async () => 1,
      aggregate: () => ({ toArray: async () => [{ avg: 4, n: 1 }] }),
    };
    const svc: any = Object.create(RatingsService.prototype);
    svc.conn = { collection: () => ratings };
    const out = await svc.forProvider('p1');
    expect(out.data).toEqual([{ score: 4, comment: 'Good', createdAt: row.createdAt, reviewer: 'Omar' }]);
    expect(projection).toMatchObject({ score: 1, comment: 1, createdAt: 1, user_name: 1 });
    expect(projection).not.toHaveProperty('user_id');
    expect(out).toMatchObject({ total: 1, avg: 4, count: 1 });
  });
});
