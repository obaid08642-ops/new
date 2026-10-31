import { ObjectId } from 'bson';
import { COLLECTION, run, type Files, type WithdrawalsDb } from './legacy-withdrawals-remove';

const logs: any[] = [];
beforeEach(() => { logs.length = 0; jest.spyOn(console, 'log').mockImplementation((l: string) => { logs.push(JSON.parse(l)); }); });
afterEach(() => jest.restoreAllMocks());

const fakeDb = (rows: Array<Record<string, any>>): WithdrawalsDb & { rows: Array<Record<string, any>> } => {
  const db: any = { rows };
  db.collection = (name: string) => {
    expect(name).toBe(COLLECTION);
    const match = (q: any, r: any) => !q?._id || (q._id.$in as any[]).some((id) => String(id) === String(r._id));
    return {
      find: (q: any) => ({ toArray: async () => db.rows.filter((r: any) => match(q, r)) }),
      deleteMany: async (q: any) => { const keep = db.rows.filter((r: any) => !match(q, r)); const deletedCount = db.rows.length - keep.length; db.rows = keep; return { deletedCount }; },
      insertMany: async (docs: any[]) => { db.rows.push(...docs); },
      countDocuments: async () => db.rows.length,
    };
  };
  return db;
};
const files = (): Files & { store: Map<string, Buffer> } => { const store = new Map<string, Buffer>(); return { store, write: (p, d) => { store.set(p, d); }, read: (p) => store.get(p)!}; };
const row = () => ({ _id: new ObjectId(), providerName: 'x', amount: 100, iban: 'SA00', status: 'pending' });

describe('legacy withdrawal rows removal (dry run, backup, delete, rollback)', () => {
  it('plan is read-only and prints ids and a hash, never names, ibans or amounts', async () => {
    const db = fakeDb([row(), row()]);
    expect(await run(db, ['plan'])).toBe(0);
    expect(db.rows).toHaveLength(2);
    expect(logs[0]).toMatchObject({ step: 'plan', total_changes: 2, writes: false });
    expect(JSON.stringify(logs)).not.toMatch(/SA00|providerName|amount/);
  });

  it('apply with the plan hash backs up, reads the backup back, deletes, and verifies nothing is left', async () => {
    const db = fakeDb([row(), row()]); const f = files();
    await run(db, ['plan']);
    const sha = logs[0].plan_sha;
    expect(await run(db, ['apply', `--expect=${sha}`, '--backup=/tmp/b.gz'], f)).toBe(0);
    expect(db.rows).toHaveLength(0);
    expect(f.store.has('/tmp/b.gz')).toBe(true);
    expect(logs.find((l) => l.step === 'backup')).toMatchObject({ ok: true, documents: 2 });
    expect(logs.find((l) => l.step === 'apply')).toMatchObject({ ok: true, deleted: 2, remaining: 0 });
  });

  it('a changed plan deletes nothing (exit 2), and apply without the hash is refused', async () => {
    const db = fakeDb([row()]);
    expect(await run(db, ['apply', `--expect=${'0'.repeat(64)}`, '--backup=/tmp/b.gz'], files())).toBe(2);
    expect(db.rows).toHaveLength(1);
    await expect(run(db, ['apply', '--backup=/tmp/b.gz'], files())).rejects.toThrow('--expect');
  });

  it('rollback puts the backed-up rows back, once', async () => {
    const db = fakeDb([row(), row()]); const f = files();
    await run(db, ['plan']);
    await run(db, ['apply', `--expect=${logs[0].plan_sha}`, '--backup=/tmp/b.gz'], f);
    expect(await run(db, ['rollback', '--backup=/tmp/b.gz'], f)).toBe(0);
    expect(db.rows).toHaveLength(2);
    await run(db, ['rollback', '--backup=/tmp/b.gz'], f);
    expect(db.rows).toHaveLength(2);
  });

  it('an empty collection has nothing to apply', async () => {
    const db = fakeDb([]);
    await run(db, ['plan']);
    expect(await run(db, ['apply', `--expect=${logs[0].plan_sha}`, '--backup=/tmp/b.gz'], files())).toBe(0);
    expect(logs.at(-1)).toMatchObject({ ok: true, deleted: 0 });
  });
});
