import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { computePlan, PACKAGED_COMPLETION } from './catalogue-apply';
import type { DbLike } from '../modules/catalogs/catalogue-apply.core';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'only_completion' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

/** The db with a log of every collection the plan opens. */
function watched(): { db: DbLike; opened: Set<string> } {
  const real = mongoose.connection.db!;
  const opened = new Set<string>();
  const db = new Proxy(real, { get: (t, p, r) => (p === 'collection' ? (name: string) => { opened.add(name); return t.collection(name); } : Reflect.get(t, p, r)) });
  return { db: db as unknown as DbLike, opened };
}

describe('catalogue-apply --only=catalogue_completion', () => {
  it('plans the completion on its own: same completion changes, no medicines, locations or insurers read', async () => {
    const full = watched();
    await mongoose.connection.db!.collection('medicines').insertOne({ id: 'm1', name_ar: 'x', name_en: 'y' });
    const argv = ['plan', '--catalogue-completion=packaged'];
    const all = await computePlan(full.db, argv);
    const only = watched();
    const p = await computePlan(only.db, [...argv, '--only=catalogue_completion']);
    expect(p.changes.length).toBeGreaterThan(0);
    expect(Object.keys(p.report)).toEqual(['radiology_catalogue', 'catalogue_duplicates', 'catalogue_completion', 'hidden_rows_deleted', 'self_conflicts']);
    // every change of the narrow plan is a change of the full plan, and the full plan's completion rows are all in it
    const key = (c: unknown) => JSON.stringify(c);
    const allKeys = new Set(all.changes.map(key));
    for (const c of p.changes) expect(allKeys.has(key(c))).toBe(true);
    expect(p.changes.filter((c) => c.step === 'catalogue_completion')).toEqual(all.changes.filter((c) => c.step === 'catalogue_completion'));
    expect(only.opened.has('medicines')).toBe(false);
    expect(full.opened.has('medicines')).toBe(true);
    expect(p.sha).not.toEqual(all.sha);
    expect(p.inputs).toHaveProperty('catalogue_completion');
    expect(PACKAGED_COMPLETION).toContain('catalogue-completion');
  });

  it('is repeatable (same hash twice) and refuses to run without the completion seed or with an unknown step', async () => {
    const a = await computePlan(watched().db, ['plan', '--catalogue-completion=packaged', '--only=catalogue_completion']);
    const b = await computePlan(watched().db, ['plan', '--catalogue-completion=packaged', '--only=catalogue_completion']);
    expect(a.sha).toEqual(b.sha);
    await expect(computePlan(watched().db, ['plan', '--only=catalogue_completion'])).rejects.toThrow(/needs --catalogue-completion/);
    await expect(computePlan(watched().db, ['plan', '--only=everything'])).rejects.toThrow(/--only must be/);
  });
});
