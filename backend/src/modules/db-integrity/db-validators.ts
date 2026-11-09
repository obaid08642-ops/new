import type { mongo } from 'mongoose';
import { LEDGER_TYPES } from '../finance-engine/finance-engine.module';
import { APPT_STATES } from '../../schemas/appointment.schema';

type Db = mongo.Db;

/**
 * R14: MongoDB `$jsonSchema` validators on the collections where a wrong shape costs money or trust. They state only what the application code ALREADY guarantees (required
 * keys the schemas mark required, the enums the code defines, amounts that cannot be negative), never new business rules, so a validator rejects a bug, not a legitimate write.
 * Rollout is staged and reversible: `warn` (the server logs a violation, the write goes through) -> watch the mongod log / `db_integrity` findings for a week -> `error` (the write is
 * refused, error 121). `validationLevel: 'moderate'` always: documents that are ALREADY invalid are not re-checked on unrelated updates, so legacy rows cannot make a healthy update fail.
 * Apply with `src/scripts/db-validators.ts` (dry run by default). Collections that do not exist yet are reported and skipped, never created.
 */
const num = { bsonType: ['int', 'long', 'double', 'decimal'] };
const money = { ...num, minimum: 0 };
/** LedgerService.append passes `gross`/`commission`/`vat` as undefined when absent and the driver stores that as null: null is a legal value there, a negative number is not. */
const moneyOrNull = { bsonType: ['int', 'long', 'double', 'decimal', 'null'], minimum: 0 };
const str = { bsonType: 'string' };
const TX_STATUSES = ['initiating', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'];

export interface ValidatorDef { collection: string; why: string; schema: Record<string, unknown> }

export const VALIDATORS: ValidatorDef[] = [
  {
    collection: 'transactions',
    why: 'a payment row without an amount, with a negative amount or a status the code does not know breaks refunds, reconciliation and the ledger',
    schema: {
      bsonType: 'object',
      required: ['booking_kind', 'booking_id', 'patient_id', 'amount'],
      properties: { booking_kind: str, booking_id: str, patient_id: str, amount: money, refunded_amount: money, currency: str, status: { enum: TX_STATUSES }, amount_halalas: { ...num, minimum: 0 } },
    },
  },
  {
    collection: 'platformledgerentries',
    why: 'the ledger is append-only money: type must be a known type, amount non-negative (direction is the type), state one of the four',
    schema: {
      bsonType: 'object',
      required: ['type', 'amount', 'createdAt'],
      properties: { type: { enum: [...LEDGER_TYPES] }, amount: money, gross: moneyOrNull, commission: moneyOrNull, vat: moneyOrNull, commission_percent: { bsonType: ['int', 'long', 'double', 'decimal', 'null'] }, state: { enum: ['pending', 'cleared', 'locked', 'released'] }, createdAt: { bsonType: 'date' }, amount_halalas: { ...num, minimum: 0 } },
    },
  },
  {
    collection: 'appointments',
    why: 'a booking without doctor, patient or slot, or in a state outside the state machine, cannot be served or refunded',
    schema: {
      bsonType: 'object',
      required: ['patient_id', 'doctor_id', 'slot_start', 'slot_end', 'status', 'price'],
      properties: { patient_id: str, doctor_id: str, slot_start: { bsonType: 'date' }, slot_end: { bsonType: 'date' }, status: { enum: Object.values(APPT_STATES) }, price: money },
    },
  },
  {
    collection: 'coupons',
    why: 'used_count is moved by atomic increments; a negative or fractional value means a bug in the release path',
    schema: { bsonType: 'object', required: ['code'], properties: { code: str, used_count: { bsonType: ['int', 'long', 'double'], minimum: 0 }, max_uses: { bsonType: ['int', 'long', 'double', 'null'], minimum: 0 } } },
  },
  {
    collection: 'refund_totals',
    why: 'running total of refunds per booking in integer halalas (R21)',
    schema: { bsonType: 'object', required: ['booking_id', 'refunded_halalas'], properties: { booking_id: str, refunded_halalas: { bsonType: ['int', 'long'], minimum: 0 } } },
  },
  {
    collection: 'refund_reservations',
    why: 'one row per refund id with a known state (R21)',
    schema: { bsonType: 'object', required: ['refund_id', 'booking_id', 'halalas', 'state'], properties: { refund_id: str, booking_id: str, halalas: { bsonType: ['int', 'long'], minimum: 0 }, state: { enum: ['reserved', 'done'] } } },
  },
  {
    collection: 'durable_events',
    why: 'the outbox rows (R2): a key, a type and a known state',
    schema: { bsonType: 'object', required: ['key', 'type', 'state'], properties: { key: str, type: str, state: { enum: ['pending', 'processing', 'done', 'dead'] }, attempts: { bsonType: ['int', 'long'], minimum: 0 } } },
  },
];

export type ValidatorAction = 'warn' | 'error';
export interface ValidatorPlanRow { collection: string; exists: boolean; current: 'none' | ValidatorAction; level?: string; sameSchema: boolean }

const stable = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

export async function planValidators(db: Db, defs: ValidatorDef[] = VALIDATORS): Promise<ValidatorPlanRow[]> {
  const infos = await db.listCollections({}, { nameOnly: false }).toArray();
  return defs.map((d) => {
    const info: any = infos.find((i) => i.name === d.collection);
    if (!info) return { collection: d.collection, exists: false, current: 'none' as const, sameSchema: false };
    const opt = info.options || {};
    const has = !!opt.validator?.$jsonSchema;
    return { collection: d.collection, exists: true, current: has ? (opt.validationAction === 'warn' ? 'warn' as const : 'error' as const) : 'none' as const, level: opt.validationLevel, sameSchema: has && stable(opt.validator.$jsonSchema) === stable(d.schema) };
  });
}

/** collMod each existing collection to the validator, level moderate, with the given action. Returns what was applied and what was skipped. */
export async function applyValidators(db: Db, action: ValidatorAction, defs: ValidatorDef[] = VALIDATORS): Promise<{ applied: string[]; skipped_absent: string[] }> {
  const plan = await planValidators(db, defs);
  const applied: string[] = []; const skipped: string[] = [];
  for (const d of defs) {
    if (!plan.find((p) => p.collection === d.collection)?.exists) { skipped.push(d.collection); continue; }
    await db.command({ collMod: d.collection, validator: { $jsonSchema: d.schema }, validationLevel: 'moderate', validationAction: action });
    applied.push(d.collection);
  }
  return { applied, skipped_absent: skipped };
}

/** Back to no validator (the rollback). */
export async function removeValidators(db: Db, defs: ValidatorDef[] = VALIDATORS): Promise<string[]> {
  const plan = await planValidators(db, defs);
  const done: string[] = [];
  for (const p of plan) if (p.exists && p.current !== 'none') { await db.command({ collMod: p.collection, validator: {}, validationLevel: 'off' }); done.push(p.collection); }
  return done;
}

/**
 * Before switching to `error`: how many EXISTING documents would not pass? (A validator never checks old rows on read; this counts them so the owner knows what `moderate`
 * is protecting.) Uses $jsonSchema as a query filter, so it is the same logic the server applies.
 */
export async function countInvalid(db: Db, defs: ValidatorDef[] = VALIDATORS): Promise<Array<{ collection: string; invalid: number; total: number }>> {
  const out = [];
  for (const d of defs) {
    const col = db.collection(d.collection);
    const total = await col.estimatedDocumentCount().catch(() => 0);
    if (!total) { out.push({ collection: d.collection, invalid: 0, total: 0 }); continue; }
    out.push({ collection: d.collection, total, invalid: await col.countDocuments({ $nor: [{ $jsonSchema: d.schema }] } as any, { maxTimeMS: 60_000 }) });
  }
  return out;
}
