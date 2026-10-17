import { SeoIndexingService } from './seo-indexing.service';

// P13-R15 fix proof: the sweep must survive a degraded IndexNow client whose
// submitUrls throws synchronously or returns a non-promise (CI failure on
// PR #1510: `submitUrls(...).catch` on `undefined`). Red without the fix.
describe('P13-R15 sweep survives a degraded IndexNow client', () => {
  function svcWith(submitUrls: any) {
    const state: any = {
      findOneAndUpdate: jest.fn(async () => null),
      findOne: jest.fn(async () => null),
      insertOne: jest.fn(async () => ({})),
      updateOne: jest.fn(async () => ({})),
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'indexnow_state') return state;
        return {
          find: jest.fn(() => ({ limit: () => ({ toArray: async () => [{ id: 'med-1', slug: 'panadol-abcdef', updatedAt: new Date() }] }) })),
        };
      }),
    };
    const svc = new SeoIndexingService(conn, { submitUrls } as any);
    return { svc, conn };
  }

  it('a throwing submitUrls does not fail the sweep', async () => {
    const { svc } = svcWith(jest.fn(() => { throw new Error('down'); }));
    const out: any = await svc.sweep(new Date(Date.now() - 60000));
    expect(out.submitted).toBeGreaterThan(0);
  });

  it('a non-promise submitUrls return does not fail the sweep', async () => {
    const { svc } = svcWith(jest.fn(() => undefined));
    const out: any = await svc.sweep(new Date(Date.now() - 60000));
    expect(out.submitted).toBeGreaterThan(0);
  });
});
