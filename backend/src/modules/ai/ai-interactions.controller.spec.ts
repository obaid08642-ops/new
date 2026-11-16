import { AiInteractionsController } from './ai-compat.controller';

/** POST /ai/drug-interactions: the patient's active medicines plus what they send, matched against the rules. */
describe('AiInteractionsController.check', () => {
  const make = (meds: any[], catalogue: any[] = []) => {
    const find = jest.fn((filter: any) => ({ toArray: async () => (filter && filter.id ? catalogue : meds) }));
    const conn = { collection: jest.fn(() => ({ find })) };
    return { controller: new AiInteractionsController(conn as any), conn, find };
  };

  it("matches the patient's own active medicines with a new drug and calls a high-severity pair unsafe", async () => {
    const { controller, find } = make([{ name: 'Warfarin' }]);
    const out = await controller.check({ id: 'p1' }, { drug: 'Aspirin' } as any);
    expect(out.interactions.some((h: any) => h.severity === 'high')).toBe(true);
    expect(out.safe).toBe(false);
    expect(out.checked).toBe(2);
    expect(find.mock.calls[0][0]).toEqual({ account_id: 'p1', active: { $ne: false } });
  });

  it('a moderate-only pair is reported but still counts as safe (only high severity blocks)', async () => {
    const { controller } = make([{ name: 'Metformin' }]);
    const out = await controller.check({ id: 'p1' }, { drugs: ['alcohol'] } as any);
    expect(out.interactions.length).toBeGreaterThan(0);
    expect(out.interactions.every((h: any) => h.severity !== 'high')).toBe(true);
    expect(out.safe).toBe(true);
  });

  it('resolves the scanner\'s medicine ids to catalogue names before matching, and counts each name once', async () => {
    const { controller, conn } = make([{ name: 'warfarin' }], [{ name: 'Ibuprofen' }]);
    const out = await controller.check({ id: 'p1' }, { meds: ['med-1'], newDrug: 'WARFARIN' } as any);
    expect(out.safe).toBe(false);
    expect(out.checked).toBe(2);
    expect(conn.collection).toHaveBeenCalledTimes(2);
  });

  it('nothing to compare is safe and empty (no invented findings)', async () => {
    const { controller } = make([]);
    expect(await controller.check({ id: 'p1' }, {} as any)).toEqual({ checked: 0, interactions: [], safe: true });
  });

  it("the medicines query is always scoped to the caller's own id", async () => {
    const { controller, find } = make([]);
    await controller.check({ _id: 'p9' }, { drug: 'x' } as any);
    expect(find.mock.calls[0][0].account_id).toBe('p9');
  });
});
