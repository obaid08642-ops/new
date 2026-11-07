/** One open claim per booking, enforced by the database (real MongoDB), and the migration that clears old duplicates. */
import { execFileSync } from 'child_process';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { InsuranceClaimSchema } from '../../schemas/insurance.schema';

jest.setTimeout(240_000);

describe('claim_one_open_per_booking', () => {
  let mongo: MongoMemoryServer; let conn: Connection; let Claim: Model<any>;
  const base = (over: Record<string, unknown> = {}) => ({ patient_id: 'p1', service: 'consultation', amount: 100, covered: 0, booking_kind: 'consultation', booking_id: 'b1', ...over });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'cu' }).asPromise();
    Claim = conn.model('InsuranceClaim', InsuranceClaimSchema);
    await Claim.init();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { await conn.collection('insurance_claims').deleteMany({}); });

  it('20 submits in the same instant for one booking: exactly one claim exists, the rest are duplicate-key errors', async () => {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => Claim.create(base())));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results) if (r.status === 'rejected') expect((r.reason as any).code).toBe(11000);
    expect(await conn.collection('insurance_claims').countDocuments({ booking_id: 'b1' })).toBe(1);
  });

  it('a facility-approved claim still blocks a second one; a rejected claim frees the booking; other bookings are unaffected', async () => {
    const first = await Claim.create(base());
    await Claim.updateOne({ id: first.id }, { $set: { status: 'approved' } });
    await expect(Claim.create(base())).rejects.toMatchObject({ code: 11000 });
    await Claim.updateOne({ id: first.id }, { $set: { status: 'rejected' } });
    await expect(Claim.create(base())).resolves.toBeTruthy();
    await expect(Claim.create(base({ booking_id: 'b2' }))).resolves.toBeTruthy();
    await expect(Claim.create(base({ booking_kind: 'lab' }))).resolves.toBeTruthy();
  });

  it('the migration lists duplicates in a dry run, rejects extra pending/approved ones with --apply, and leaves double payouts for a human', async () => {
    await conn.collection('insurance_claims').dropIndexes();      // data from before the index existed
    const col = conn.collection('insurance_claims');
    const t = (n: number) => new Date(Date.UTC(2026, 10, 1, 0, n));
    await col.insertMany([
      { id: 'a1', booking_kind: 'lab', booking_id: 'x', status: 'pending', amount: 50, createdAt: t(1) },
      { id: 'a2', booking_kind: 'lab', booking_id: 'x', status: 'approved', amount: 50, createdAt: t(2) },
      { id: 'a3', booking_kind: 'lab', booking_id: 'x', status: 'pending', amount: 50, createdAt: t(3) },
      { id: 'm1', booking_kind: 'lab', booking_id: 'y', status: 'reimbursed', amount: 50, createdAt: t(1) },
      { id: 'm2', booking_kind: 'lab', booking_id: 'y', status: 'reimbursed', amount: 50, createdAt: t(2) },
      { id: 'ok', booking_kind: 'lab', booking_id: 'z', status: 'pending', amount: 50, createdAt: t(1) },
    ] as any[]);
    const run = (args: string[]) => {
      try { return { code: 0, out: execFileSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-11-claim-duplicates.ts', ...args], { env: { ...process.env, MONGODB_URI: mongo.getUri(), DB_NAME: 'cu' }, encoding: 'utf8' }) }; }
      catch (e: any) { return { code: e.status as number, out: String(e.stdout) }; }
    };
    const dry = run([]);
    expect(dry.out).toContain('would reject a1 (pending), a3 (pending) for lab/x; keep a2 (approved)');
    expect(dry.out).toContain('MANUAL lab/y');
    expect(dry.code).toBe(2);
    expect(await col.countDocuments({ status: 'rejected' })).toBe(0);            // nothing changed
    run(['--apply']);
    const status = async (id: string) => ((await col.findOne({ id })) as any).status;
    expect([await status('a1'), await status('a2'), await status('a3')]).toEqual(['rejected', 'approved', 'rejected']);
    expect([await status('m1'), await status('m2'), await status('ok')]).toEqual(['reimbursed', 'reimbursed', 'pending']);
    expect(((await col.findOne({ id: 'a1' })) as any).decision_note).toContain('duplicate of a2');
  });
});
