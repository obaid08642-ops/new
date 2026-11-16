import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';
import { OrderSchema } from '../../schemas/order.schema';
import { TransactionSchema } from '../../schemas/transaction.schema';
import { PharmacyOrderSchema } from '../pharmacy/schemas/pharmacy.schema';
import { FAILED_PAYMENT_STATUSES, SLA_SOURCES, STUCK_SOURCES, slaBreachFilter } from './ops-alert-queries';

/**
 * Sweep part 2 (queue 12:10, item 2). The urgent-alert job runs every 5 minutes (and the admin "today" screen on demand): for each order kind the open orders older than N minutes, for four kinds the
 * breached SLAs, and the failed payments of the last hour. With the schema indexes only, each of these read the whole collection. These checks use the REAL query filters of ops-alert-queries.ts and the
 * REAL schema indexes on a real MongoDB with 3,000 closed rows per collection: the open rows are found through an index and the closed ones are not examined.
 */
const SCHEMAS: Record<string, mongoose.Schema> = {
  labbookings: LabBookingSchema, radiologybookings: RadiologyBookingSchema, homecarebookings: HomeCareBookingSchema, appointments: AppointmentSchema,
  orders: OrderSchema, transactions: TransactionSchema, pharmacy_orders: PharmacyOrderSchema,
};

describe('the 5-minute alert queries are served by indexes (explain, real schema indexes)', () => {
  let mongod: MongoMemoryServer;
  const N = 3000;
  const OLD = new Date(Date.now() - 3 * 3600_000);
  const cutoff = new Date(Date.now() - 30 * 60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'ops_alerts' });
    for (const [name, schema] of Object.entries(SCHEMAS)) {
      const col = mongoose.connection.collection(name);
      await col.createIndex({ _unused_: 1 }).catch(() => null);   // creates the collection
      for (const [keys, options] of schema.indexes() as Array<[Record<string, unknown>, Record<string, unknown>]>) {
        if (Object.values(keys).includes('text') || (options as Record<string, unknown>).unique) continue;   // unique indexes are not what is tested and a bare fixture cannot satisfy them
        const { background: _b, ...opts } = options as Record<string, unknown>;
        await col.createIndex(keys as any, opts as any).catch(() => null);
      }
    }
    const closed = (stateField: string, state: string, extra: Record<string, unknown> = {}) => Array.from({ length: N }, (_, i) => ({ id: `c${i}`, [stateField]: state, createdAt: new Date(Date.now() - (i + 1) * 60_000 * 90), sla_due_at: new Date(Date.now() + 86400000), ...extra }));
    for (const s of STUCK_SOURCES) {
      const col = mongoose.connection.collection(s.col);
      await col.insertMany([...closed(s.field, 'CLOSED_X'), { id: 'stuck1', [s.field]: s.states[0], createdAt: OLD }, { id: 'stuck2', [s.field]: s.states[0], createdAt: OLD }] as any);
    }
    for (const s of SLA_SOURCES) {
      const col = mongoose.connection.collection(s.col);
      await col.insertMany([{ id: 'late1', state: 'CONFIRMED', createdAt: new Date(), sla_due_at: new Date(Date.now() - 3600_000) }] as any);
    }
    await mongoose.connection.collection('transactions').insertMany([
      ...Array.from({ length: N }, (_, i) => ({ id: `t${i}`, status: 'paid', updatedAt: new Date(Date.now() - i * 1000) })),
      { id: 'f1', status: 'failed', updatedAt: new Date() }, { id: 'f2', status: 'cancelled', updatedAt: new Date() },
    ] as any);
  }, 240_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const used = (plan: any) => JSON.stringify(plan.queryPlanner.winningPlan);

  it.each(STUCK_SOURCES.map((s) => [s.kind, s.col, s.field, s.states] as const))('stuck orders of %s (%s): closed rows are not examined (existing state index, no collection scan)', async (_kind, col, field, states) => {
    const plan: any = await mongoose.connection.collection(col)
      .find({ [field]: { $in: states }, createdAt: { $lt: cutoff } } as any, { projection: { _id: 0, id: 1 } }).sort({ createdAt: 1 }).limit(50).explain('executionStats');
    expect(plan.executionStats.nReturned).toBe(2);
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(10);
    expect(used(plan)).not.toContain('COLLSCAN');   // the existing state / status indexes serve it: no new index needed
  });

  it.each(SLA_SOURCES.map((s) => [s.kind, s.col, s.closed] as const))('SLA breaches of %s (%s): found through the sla_due_at index', async (_kind, col, closed) => {
    const plan: any = await mongoose.connection.collection(col)
      .find(slaBreachFilter([...closed], new Date()) as any, { projection: { _id: 0, id: 1 } }).sort({ sla_due_at: 1 }).limit(200).explain('executionStats');
    expect(plan.executionStats.totalDocsExamined).toBeLessThanOrEqual(10);
    expect(used(plan)).toContain('alerts_sla_due_v1');
  });

  it('failed payments of the last hour: counted through the status + updatedAt index', async () => {
    const since = new Date(Date.now() - 3600_000);
    const plan: any = await mongoose.connection.collection('transactions').aggregate([{ $match: { status: { $in: FAILED_PAYMENT_STATUSES }, updatedAt: { $gte: since } } }, { $count: 'n' }]).explain('executionStats');
    const stats = plan.stages?.[0]?.$cursor?.executionStats ?? plan.executionStats;
    expect(stats.totalDocsExamined).toBeLessThanOrEqual(5);
    expect(JSON.stringify(plan)).toContain('alerts_failed_payments_v1');
    expect(await mongoose.connection.collection('transactions').countDocuments({ status: { $in: FAILED_PAYMENT_STATUSES }, updatedAt: { $gte: since } })).toBe(2);
  });
});
