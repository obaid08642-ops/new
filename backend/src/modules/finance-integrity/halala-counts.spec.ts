import { Target, TARGETS, checkShadows, halalaCountLines, planBackfill } from './halala-backfill';

/** A tiny in-memory stand-in for the parts of the driver the read-only counts use: countDocuments / find with $type and $exists on top-level fields, async-iterable. */
type Doc = Record<string, unknown>;
const matches = (d: Doc, filter: Record<string, any>): boolean =>
  Object.entries(filter).every(([k, c]) => {
    const v = d[k];
    if (c && typeof c === 'object' && '$type' in c) return typeof v === 'number';
    if (c && typeof c === 'object' && '$exists' in c) return c.$exists ? k in d : !(k in d);
    return v === c;
  });
function fakeDb(data: Record<string, Doc[]>): any {
  return {
    collection: (name: string) => ({
      countDocuments: async (f: Record<string, any>) => (data[name] ?? []).filter((d) => matches(d, f)).length,
      find: (f: Record<string, any>) => ({ async *[Symbol.asyncIterator]() { for (const d of data[name] ?? []) if (matches(d, f)) yield { ...d }; } }),
    }),
  };
}
const ONE: Target[] = [{ collection: 'transactions', fields: ['amount'] }];

describe('R11 halala counts (read-only)', () => {
  it('counts doubles, missing shadows (clean / unclean) and shadows that disagree with their double', async () => {
    const db = fakeDb({ transactions: [
      { amount: 12.34, amount_halalas: 1234 },        // agrees
      { amount: 10, amount_halalas: 1001 },           // disagrees by 1 halala
      { amount: 5, amount_halalas: 400 },             // disagrees by a lot
      { amount: 7.5 },                                // clean, shadow missing
      { amount: 0.1 + 0.2 },                          // unclean (float drift), shadow missing
      { amount: -3 },                                 // negative on an unsigned target: unclean, shadow missing
      { amount: 20, amount_halalas: '2000' },         // shadow is not a number: disagrees
      { amount: 'text' },                             // not a double: not counted
    ] });
    const plan = await planBackfill(db, ONE, 0);
    const shadows = await checkShadows(db, ONE);
    expect(plan[0]).toMatchObject({ to_fill: 1, unclean: 2 });
    expect(shadows[0]).toEqual({ collection: 'transactions', field: 'amount', doubles: 7, shadow_present: 4, shadow_disagree: 3 });
    expect(halalaCountLines(plan, shadows)).toEqual([
      'halala-counts: transactions.amount doubles=7 missing_shadow=3 (clean=1 unclean=2) shadow_present=4 shadow_disagree=3',
      'halala-counts: TOTAL fields=1 missing_shadow=3 unclean=2 shadow_disagree=3',
    ]);
  });

  it('a shadow that matches toHalalas of an unclean double is NOT a disagreement (the dual write rounds it the same way)', async () => {
    const db = fakeDb({ transactions: [{ amount: 1.005, amount_halalas: 101 }, { amount: 0.1 + 0.2, amount_halalas: 30 }] });
    expect((await checkShadows(db, ONE))[0]).toMatchObject({ shadow_present: 2, shadow_disagree: 0 });
  });

  it('a double that toHalalas rejects counts as a disagreement; nothing throws', async () => {
    const db = fakeDb({ transactions: [{ amount: Infinity, amount_halalas: 1 }, { amount: 1e300, amount_halalas: 1 }] });
    expect((await checkShadows(db, ONE))[0]).toMatchObject({ shadow_present: 2, shadow_disagree: 2 });
  });

  it('empty collections give zero rows, and the output carries only names and counts', async () => {
    const db = fakeDb({});
    const lines = halalaCountLines(await planBackfill(db, TARGETS, 0), await checkShadows(db, TARGETS));
    expect(lines.length).toBe(TARGETS.reduce((n, t) => n + t.fields.length, 0) + 1);
    expect(lines.every((l) => /^halala-counts: [A-Za-z_.]+ /.test(l) || l.startsWith('halala-counts: TOTAL'))).toBe(true);
    expect(lines.join('\n')).not.toMatch(/\bid=|\bvalue=/);
  });

  it('writes nothing: the fake driver has no write method, so any write would throw', async () => {
    const db = fakeDb({ transactions: [{ amount: 1 }] });
    await expect(checkShadows(db, ONE)).resolves.toBeDefined();
    await expect(planBackfill(db, ONE, 0)).resolves.toBeDefined();
  });
});
