import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, resolveSelfConflicts, rollbackChanges } from './catalogue-apply.core';
import type { Change, DbLike, SetChange } from './catalogue-apply.core';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'self_conflict' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

const set = (step: string, id: unknown, path: string, before: unknown, after: unknown, collection = 'lab_services'): SetChange => ({ kind: 'set', step, collection, key: { _id: id }, path, before, after });

describe('one write per field in the plan', () => {
  it("a duplicate's marker beats the completion's default on the same row and field, and the pair is reported by step and path (no values)", () => {
    const plan: Change[] = [
      set('catalogue_completion', 'r1', 'is_deleted', null, false),
      set('catalogue_duplicates', 'r1', 'is_deleted', null, true),
      set('catalogue_duplicates', 'r1', 'merged_into', null, 'keeper'),
      set('catalogue_completion', 'r1', 'public_eligibility', null, true),
    ];
    const r = resolveSelfConflicts(plan);
    expect(r.changes.map((c) => `${c.step}:${(c as SetChange).path}:${(c as SetChange).after}`).sort()).toEqual([
      'catalogue_completion:public_eligibility:true', 'catalogue_duplicates:is_deleted:true', 'catalogue_duplicates:merged_into:keeper',
    ]);
    expect(r.report).toEqual({ by_pair: { 'catalogue_duplicates>catalogue_completion lab_services.is_deleted': 1 }, dropped: 1, identical_collapsed: 0, chained: 0 });
    expect(JSON.stringify(r.report)).not.toContain('keeper');
  });

  it('two losers filling the same empty field of one keeper: the first stands (or collapses when identical); other rows and fields are untouched', () => {
    const plan: Change[] = [
      set('catalogue_duplicates', 'k', 'name_en', null, 'Glucose'),
      set('catalogue_duplicates', 'k', 'name_en', null, 'Glucose'),
      set('catalogue_duplicates', 'k', 'description_en', null, 'a'),
      set('catalogue_duplicates', 'k', 'description_en', null, 'b'),
      set('catalogue_duplicates', 'other', 'name_en', null, 'x'),
    ];
    const r = resolveSelfConflicts(plan);
    expect(r.changes).toHaveLength(3);
    expect((r.changes.find((c) => (c as SetChange).path === 'description_en') as SetChange).after).toBe('a');
    expect(r.report).toMatchObject({ dropped: 1, identical_collapsed: 1, by_pair: { 'catalogue_duplicates>catalogue_duplicates lab_services.description_en': 1 } });
  });

  it('a parent path and a child path of it are the same field; sets on different rows, deletes and inserts are never dropped', () => {
    const plan: Change[] = [
      set('catalogue_duplicates', 'r', 'translations', null, { hi: { name: 'x' } }),
      set('catalogue_completion', 'r', 'translations.hi.name', null, 'y'),
      set('catalogue_completion', 'r2', 'translations.hi.name', null, 'y'),
      { kind: 'delete', step: 'catalogue_hidden_delete', collection: 'lab_services', key: { _id: 'r' }, doc: { _id: 'r' } },
    ];
    const r = resolveSelfConflicts(plan);
    expect(r.changes).toHaveLength(3);
    expect(r.report.by_pair).toEqual({ 'catalogue_duplicates>catalogue_completion lab_services.translations~translations.hi.name': 1 });
  });

  it('a chain on one field (the second before is the first after) is merged into one write, first before to last after, not dropped', () => {
    const r = resolveSelfConflicts([set('districts', 'loc', 'coordinates', [1, 1], [2, 2]), set('districts', 'loc', 'coordinates', [2, 2], [3, 3]), set('districts', 'loc', 'source', 'a', 'b')]);
    expect(r.changes).toEqual([set('districts', 'loc', 'coordinates', [1, 1], [3, 3]), set('districts', 'loc', 'source', 'a', 'b')]);
    expect(r.report).toMatchObject({ chained: 1, dropped: 0 });
  });

  it('rows keyed by code and type (locations) are different rows when the code differs', () => {
    const loc = (code: string): SetChange => ({ kind: 'set', step: 'districts', collection: 'locations', key: { code, type: 'district' }, path: 'coordinates', before: null, after: { lat: 1, lng: 1 } });
    const plan = [loc('a'), loc('b')];
    expect(resolveSelfConflicts(plan).changes).toBe(plan);
  });

  it('is deterministic, leaves a plan without conflicts as it is, and does not depend on the order the steps were planned in', () => {
    const a = set('catalogue_duplicates', 'r', 'is_deleted', null, true);
    const b = set('catalogue_completion', 'r', 'is_deleted', null, false);
    expect(resolveSelfConflicts([a, b]).changes).toEqual([a]);
    expect(resolveSelfConflicts([b, a]).changes).toEqual([a]);
    const clean: Change[] = [a, set('catalogue_completion', 'r2', 'is_deleted', null, false)];
    expect(resolveSelfConflicts(clean).changes).toBe(clean);
    expect(resolveSelfConflicts(clean).report).toEqual({ by_pair: {}, dropped: 0, identical_collapsed: 0, chained: 0 });
  });
});

describe('apply and rollback with a row two steps would have written', () => {
  const rows = () => mongoose.connection.db!.collection('lab_services');
  const snapshot = async () => (await rows().find({}).sort({ _id: 1 }).toArray());

  it('unresolved, the second write is skipped (the failure of run 64); resolved, nothing is skipped, the marker stands, and rollback restores every document exactly', async () => {
    await rows().deleteMany({});
    await rows().insertMany([{ _id: 'loser' as never, code: 'L', name_ar: 'x' }, { _id: 'keeper' as never, code: 'K', name_ar: 'y' }]);
    const before = await snapshot();
    const plan: Change[] = [
      set('catalogue_duplicates', 'loser', 'is_deleted', null, true),
      set('catalogue_duplicates', 'loser', 'merged_into', null, 'keeper'),
      set('catalogue_duplicates', 'keeper', 'name_en', null, 'Glucose'),
      set('catalogue_duplicates', 'keeper', 'name_en', null, 'Glucose'),
      set('catalogue_completion', 'loser', 'is_deleted', null, false),
      set('catalogue_completion', 'loser', 'public_eligibility', null, true),
    ];
    const db = mongoose.connection.db as unknown as DbLike;

    const naive = await applyChanges(db, plan);
    expect(naive.skipped_changed_since_plan).toBe(2);                    // the duplicate keeper fill and the completion's is_deleted
    await rollbackChanges(db, plan);
    expect(await snapshot()).toEqual(before);                            // even the failed run rolls back to the backup

    const { changes, report } = resolveSelfConflicts(plan);
    expect(report.dropped + report.identical_collapsed).toBe(2);
    const applied = await applyChanges(db, changes);
    expect(applied).toMatchObject({ applied: 4, skipped_changed_since_plan: 0 });
    const loser = await rows().findOne({ _id: 'loser' as never });
    expect(loser).toMatchObject({ is_deleted: true, merged_into: 'keeper', public_eligibility: true });
    expect(await rows().findOne({ _id: 'keeper' as never })).toMatchObject({ name_en: 'Glucose' });

    const rolled = await rollbackChanges(db, changes);
    expect(rolled.skipped_changed_since).toBe(0);
    expect(await snapshot()).toEqual(before);
  });
});
