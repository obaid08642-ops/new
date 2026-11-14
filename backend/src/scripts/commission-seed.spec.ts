import { applyCommissionSeed, planCommissionSeed, run, type SeedDb } from './commission-seed';

function db(initial: any | null) {
  let doc: any = initial ? JSON.parse(JSON.stringify(initial)) : null;
  const get = (path: string) => path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), doc);
  const set = (path: string, value: unknown) => { const ks = path.split('.'); let o = doc; ks.slice(0, -1).forEach((k) => { o[k] = o[k] ?? {}; o = o[k]; }); o[ks[ks.length - 1]] = value; };
  const fake: SeedDb = {
    collection: () => ({
      findOne: async () => doc,
      insertOne: async (d: any) => { if (doc) throw new Error('dup'); doc = d; },
      updateOne: async (q: any, u: any) => {
        const guard = Object.entries(q).find(([k]) => k !== 'key');
        if (!doc || (guard && get(guard[0]) !== undefined)) return { matchedCount: 0, modifiedCount: 0 }; // `$exists: false` fails when the field is there
        for (const [k, v] of Object.entries(u.$set)) set(k, v);
        return { matchedCount: 1, modifiedCount: 1 };
      },
    }),
  };
  return { fake, doc: () => doc };
}
const percents = (d: any) => Object.fromEntries(Object.entries(d.service_types).map(([k, v]: any) => [k, v.percent]));
const DEFAULTS = { pharmacy: 10, doctor: 15, lab: 12, radiology: 12, nursing: 15 };

describe('commission seed', () => {
  it('dry run (the default) lists what is missing and writes nothing', async () => {
    const d = db(null);
    expect(await planCommissionSeed(d.fake)).toMatchObject({ document_missing: true });
    expect((await planCommissionSeed(d.fake)).changes.map((c) => c.field)).toEqual(['service_types.pharmacy.percent', 'service_types.doctor.percent', 'service_types.lab.percent', 'service_types.radiology.percent', 'service_types.nursing.percent', 'tax.vat_percent']);
    expect(await applyCommissionSeed(d.fake, false)).toEqual({ written: [], skipped: [] });
    expect(d.doc()).toBeNull();
    expect(await run(d.fake, [])).toBe(0);
    expect(d.doc()).toBeNull();
  });
  it('--apply on a missing document writes exactly the defaults: 10 / 15 / 12 / 12 / 15 and VAT 15', async () => {
    const d = db(null);
    expect(await run(d.fake, ['--apply'])).toBe(0);
    expect(percents(d.doc())).toEqual(DEFAULTS);
    expect(d.doc().tax.vat_percent).toBe(15);
  });
  it('NEVER overwrites an admin-set value: only the missing percents are filled, a 0 stays 0', async () => {
    const d = db({ key: 'commissions', service_types: { doctor: { percent: 20 }, lab: { percent: 0 } }, tax: { vat_percent: 5 } });
    const plan = await planCommissionSeed(d.fake);
    expect(plan.changes.map((c) => c.field)).toEqual(['service_types.pharmacy.percent', 'service_types.radiology.percent', 'service_types.nursing.percent']);
    expect(plan.present).toEqual([{ field: 'service_types.doctor.percent', value: 20 }, { field: 'service_types.lab.percent', value: 0 }, { field: 'tax.vat_percent', value: 5 }]);
    expect(await run(d.fake, ['--apply'])).toBe(0);
    expect(percents(d.doc())).toEqual({ doctor: 20, lab: 0, pharmacy: 10, radiology: 12, nursing: 15 });
    expect(d.doc().tax.vat_percent).toBe(5);
  });
  it('a value set between the plan and the write is skipped, not overwritten; a second run changes nothing', async () => {
    const d = db({ key: 'commissions', service_types: {}, tax: {} });
    expect((await planCommissionSeed(d.fake)).changes).toHaveLength(6); // the plan sees everything missing ...
    d.doc().service_types.doctor = { percent: 11 }; // ... then the admin sets doctor before the apply
    const result = await applyCommissionSeed(d.fake, true);
    expect(result.written.map((c) => c.field)).not.toContain('service_types.doctor.percent');
    expect(d.doc().service_types.doctor.percent).toBe(11);
    expect((await applyCommissionSeed(d.fake, true)).written).toEqual([]);
  });
});
