import { isOffered, CatalogueRegistrationService, RegistrationView } from './catalogue-registration.service';
import { applyRegistrationBackfill, planRegistrationBackfill, rollbackRegistrationBackfill, CATALOGUE_SOURCES } from './catalogue-backfill';
import { CATALOGUE_KINDS, CatalogueRegistrationSchema } from './catalogue-registration.schema';

const reg = (o: Partial<RegistrationView>): RegistrationView => ({ kind: 'medicine', concept_id: 'm1', market_id: 'SA', local_code: null, status: 'active', effective_from: new Date(0), ...o });

describe('isOffered', () => {
  it('a registered, active, effective concept is offered in its market only', () => {
    const rows = [reg({})];
    expect(isOffered(rows, 'medicine', 'm1', 'SA')).toBe(true);
    expect(isOffered(rows, 'medicine', 'm1', 'EG')).toBe(false); // no Saudi default for another market
  });
  it('retired and not-yet-effective rows are not offered; kind must match', () => {
    expect(isOffered([reg({ status: 'retired' })], 'medicine', 'm1', 'SA')).toBe(false);
    expect(isOffered([reg({ effective_from: new Date('2030-01-01') })], 'medicine', 'm1', 'SA', new Date('2026-01-01'))).toBe(false);
    expect(isOffered([reg({})], 'lab_test', 'm1', 'SA')).toBe(false);
  });
});

describe('catalogue_registrations schema', () => {
  it('has no money fields and a unique (kind, concept, market) index', () => {
    const paths = Object.keys(CatalogueRegistrationSchema.paths);
    expect(paths.filter((p) => /price|amount|fee|currency|cost/i.test(p))).toEqual([]);
    const unique = CatalogueRegistrationSchema.indexes().find(([k, o]) => (o as { unique?: boolean }).unique && JSON.stringify(k) === JSON.stringify({ kind: 1, concept_id: 1, market_id: 1 }));
    expect(unique).toBeDefined();
  });
  it('covers every catalogue source kind', () => {
    for (const s of CATALOGUE_SOURCES) expect(CATALOGUE_KINDS).toContain(s.kind);
  });
});

/** Minimal in-memory Db: collections of docs; find(filter, {projection}) with the few filters the backfill uses, bulkWrite upserts. */
function fakeDb(data: Record<string, Array<Record<string, any>>>) {
  const match = (d: Record<string, any>, f: Record<string, any>) => Object.entries(f).every(([k, v]) => {
    if (v && typeof v === 'object' && '$exists' in v) { const ok = d[k] !== undefined; return v.$exists ? ok && (v.$ne === undefined || d[k] !== v.$ne) : !ok; }
    return d[k] === v;
  });
  const col = (name: string) => {
    const docs = data[name] ?? (data[name] = []);
    return {
      find: (f: Record<string, any> = {}) => { const rows = docs.filter((d) => match(d, f)); return { toArray: async () => rows, [Symbol.asyncIterator]: async function* () { for (const r of rows) yield r; } }; },
      countDocuments: async (f: Record<string, any>) => docs.filter((d) => match(d, f)).length,
      deleteMany: async (f: Record<string, any>) => { for (let i = docs.length - 1; i >= 0; i--) if (match(docs[i], f)) docs.splice(i, 1); },
      bulkWrite: async (ops: Array<{ updateOne: { filter: Record<string, any>; update: { $setOnInsert: Record<string, any> } } }>) => {
        let upsertedCount = 0;
        for (const { updateOne: u } of ops) if (!docs.some((d) => match(d, u.filter))) { docs.push({ ...u.update.$setOnInsert }); upsertedCount++; }
        return { upsertedCount };
      },
    };
  };
  return { collection: col } as never;
}

describe('registration backfill', () => {
  const data = () => ({
    medicines: [{ _id: 1, id: 'm1' }, { _id: 2, id: 'm2', deleted_at: new Date() }],
    lab_services: [{ _id: 3, id: 'l1', short_code: ' CBC ', active: true }, { _id: 4, id: 'l2', active: false }],
    radiology_services: [], nursing_services: [{ _id: 5, id: 'n1' }], specialties: [{ _id: 6, id: 'spec-cardio', code: 'cardio', active: true }],
  } as Record<string, Array<Record<string, any>>>);

  it('dry run counts per kind and writes nothing', async () => {
    const d = data();
    const plan = await planRegistrationBackfill(fakeDb(d), 'SA');
    expect(plan.find((r) => r.kind === 'medicine')).toEqual({ kind: 'medicine', concepts: 2, missing: 2 });
    expect(plan.find((r) => r.kind === 'lab_test')?.missing).toBe(2);
    expect(d.catalogue_registrations ?? []).toHaveLength(0);
  });
  it('registers every concept in SA from epoch, retired for inactive ones, with local codes', async () => {
    const d = data();
    const r = await applyRegistrationBackfill(fakeDb(d), 'SA');
    expect(r.written).toBe(6);
    const regs = d.catalogue_registrations;
    const by = (id: string) => regs.find((x) => x.concept_id === id)!;
    expect(by('m1')).toMatchObject({ kind: 'medicine', market_id: 'SA', status: 'active', local_code: null });
    expect(by('m2').status).toBe('retired');
    expect(by('l1')).toMatchObject({ local_code: 'CBC', status: 'active' });
    expect(by('l2').status).toBe('retired');
    expect(by('spec-cardio').local_code).toBe('cardio');
    expect(regs.every((x) => x.effective_from.getTime() === 0 && /^backfill:[0-9a-f-]{36}$/.test(x.created_by))).toBe(true);
  });
  it('is idempotent and never undoes a later retire', async () => {
    const d = data();
    const db = fakeDb(d);
    await applyRegistrationBackfill(db, 'SA');
    d.catalogue_registrations.find((x) => x.concept_id === 'm1')!.status = 'retired';
    expect((await applyRegistrationBackfill(db, 'SA')).written).toBe(0);
    expect(d.catalogue_registrations.find((x) => x.concept_id === 'm1')!.status).toBe('retired');
    expect(d.catalogue_registrations).toHaveLength(6);
  });
  it('another market gets its own rows, the SA rows stay', async () => {
    const d = data();
    const db = fakeDb(d);
    await applyRegistrationBackfill(db, 'SA');
    expect((await applyRegistrationBackfill(db, 'EG')).written).toBe(6);
    expect(d.catalogue_registrations).toHaveLength(12);
  });
});

describe('registration rollback', () => {
  it('deletes exactly the rows one run created (dry run counts first), leaving other runs and manual rows', async () => {
    const d = { medicines: [{ _id: 1, id: 'm1' }], lab_services: [{ _id: 2, id: 'l1', active: true }], radiology_services: [], nursing_services: [], specialties: [] } as Record<string, Array<Record<string, any>>>;
    const db = fakeDb(d);
    d.catalogue_registrations = [{ kind: 'medicine', concept_id: 'manual', market_id: 'SA', created_by: 'admin' }];
    const run = await applyRegistrationBackfill(db, 'SA', { runId: 'r1' });
    expect(run.written).toBe(2);
    expect(await rollbackRegistrationBackfill(db, 'r1')).toEqual([{ kind: 'medicine', written: 1 }, { kind: 'lab_test', written: 1 }, { kind: 'radiology_service', written: 0 }, { kind: 'nursing_service', written: 0 }, { kind: 'specialty', written: 0 }]);
    expect(d.catalogue_registrations).toHaveLength(3);
    await rollbackRegistrationBackfill(db, 'r1', { apply: true });
    expect(d.catalogue_registrations).toEqual([{ kind: 'medicine', concept_id: 'manual', market_id: 'SA', created_by: 'admin' }]);
  });
});

describe('CatalogueRegistrationService', () => {
  it('offeredConceptIds filters by kind, market, active and effective date', async () => {
    const find = jest.fn(() => ({ lean: async () => [{ concept_id: 'a' }, { concept_id: 'b' }] }));
    const svc = new CatalogueRegistrationService({ find } as never);
    const at = new Date('2026-05-01');
    expect(await svc.offeredConceptIds('medicine', 'SA', at)).toEqual(['a', 'b']);
    expect(find).toHaveBeenCalledWith({ kind: 'medicine', market_id: 'SA', status: 'active', effective_from: { $lte: at } }, { concept_id: 1 });
  });
  it('register upserts without touching effective_from on an existing row; retire reports whether it changed', async () => {
    const updateOne = jest.fn(async () => ({ modifiedCount: 1 }));
    const svc = new CatalogueRegistrationService({ updateOne } as never);
    await svc.register('lab_test', 'l1', 'EG', { local_code: 'X1', created_by: 'admin' });
    const [filter, update, opts] = (updateOne.mock.calls[0] as unknown) as [Record<string, unknown>, Record<string, Record<string, unknown>>, { upsert: boolean }];
    expect(filter).toEqual({ kind: 'lab_test', concept_id: 'l1', market_id: 'EG' });
    expect(update.$set).toEqual({ status: 'active', local_code: 'X1' });
    expect(Object.keys(update.$setOnInsert)).toEqual(['effective_from', 'created_by']);
    expect(opts.upsert).toBe(true);
    expect(await svc.retire('lab_test', 'l1', 'EG')).toBe(true);
  });
});
