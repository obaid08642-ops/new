import { randomUUID } from 'crypto';
import type { mongo } from 'mongoose';
import { SA_MARKET } from './sa-market.seed';

type Db = mongo.Db;

/**
 * Collections that carry market data (classes other than Global in docs/platform/mc-audit/data-classification.md).
 * Names are the real collection names: explicit `collection:` values from the schemas, plus the money collections the
 * R11 halala backfill already targets. Ephemeral login/session collections are left out.
 */
export const MARKET_BACKFILL_COLLECTIONS: readonly string[] = [
  'ai_interactions', 'appointments', 'approval_requests', 'b2b_requests', 'booking_attachments', 'breathing_sessions', 'cancellation_penalties', 'candidate_profiles',
  'challenge_progress', 'consultation_notes', 'corporate_accounts', 'deliveries', 'diagnostic_orders', 'doctor_appointments', 'doctor_chat_messages', 'doctors', 'facilities',
  'facility_admissions', 'facility_beds', 'facility_invitations', 'facility_wards', 'family_groups', 'family_permission_requests', 'fraud_alerts', 'health_records',
  'in_app_notifications', 'insurance_claims', 'insurance_companies', 'insurance_coverage_rules', 'insurance_networks', 'job_applications', 'job_postings', 'lab_samples',
  'locations', 'loyalty_accounts', 'loyalty_challenges', 'loyalty_rewards', 'loyalty_transactions', 'medication_doses', 'medication_plans', 'meditation_sessions',
  'mood_entries', 'moyasar_payments', 'notifications', 'nurse_providers', 'nutrition_exercise_logs', 'nutrition_meal_logs', 'nutrition_profiles', 'nutrition_water_logs',
  'orders', 'outbound_referrals', 'patient_crm_tags', 'patient_profiles', 'pharmacy_allocations', 'pharmacy_bids', 'pharmacy_broadcasts', 'pharmacy_chat_messages',
  'pharmacy_chat_threads', 'pharmacy_drug_rejection_logs', 'pharmacy_inventory', 'pharmacy_low_stock_alerts', 'pharmacy_offers', 'pharmacy_orders',
  'pharmacy_prescription_intakes', 'prescriptions', 'promotioncampaigns', 'provider_accounts', 'provider_assignment_attempts', 'provider_audit_logs', 'provider_availability',
  'provider_bank_accounts', 'provider_branches', 'provider_capabilities_doctor_sessions', 'provider_capabilities_lab', 'provider_capabilities_pharmacy',
  'provider_delivery_zones', 'provider_deltas', 'provider_documents', 'provider_notifications', 'provider_offerings', 'provider_operators', 'provider_profiles',
  'provider_requests', 'provider_schedule_slots', 'provider_schedules', 'provider_scores', 'referral_codes', 'referral_rewards', 'reward_claims', 'shared_calendar_events',
  'staff_attendance', 'staff_shifts', 'surgery_bookings', 'unified_carts', 'users', 'wallet_transactions', 'wallets',
  'transactions', 'platformledgerentries', 'einvoices', 'refundrequests', 'labbookings', 'radiologybookings', 'homecarebookings',
];

export interface MarketBackfillRow { collection: string; missing: number }

const MISSING = { market_id: { $exists: false } };

/** READ-ONLY: how many documents per collection still lack `market_id`. */
export async function planMarketBackfill(db: Db, collections: readonly string[] = MARKET_BACKFILL_COLLECTIONS): Promise<MarketBackfillRow[]> {
  const rows: MarketBackfillRow[] = [];
  for (const c of collections) rows.push({ collection: c, missing: await db.collection(c).countDocuments(MISSING) });
  return rows;
}

/** Written on every stamped document so exactly that run can be undone. */
export const RUN_FIELD = 'market_backfill_run';

/**
 * Stamps `market_id` (and `operator_id`) = the launch market on documents that lack it. Idempotent: documents that already have a
 * market are never touched, so it is safe to re-run and safe next to live writes. Batched by `_id` so no collection is locked for long.
 * Every stamped document also gets `market_backfill_run = runId`, so `rollbackMarketBackfill(runId)` removes exactly what this run wrote.
 * Dry run is `planMarketBackfill`; take a backup before `--apply` (same discipline as the R11 halala backfill).
 */
export async function applyMarketBackfill(
  db: Db,
  opts: { collections?: readonly string[]; batch?: number; market?: { id: string; operator_id: string }; runId?: string } = {},
): Promise<{ written: number; run_id: string; per_collection: MarketBackfillRow[] }> {
  const market = opts.market ?? { id: SA_MARKET.id, operator_id: SA_MARKET.operator_id };
  const batch = opts.batch ?? 1000;
  const runId = opts.runId ?? randomUUID();
  let written = 0;
  const per: MarketBackfillRow[] = [];
  for (const c of opts.collections ?? MARKET_BACKFILL_COLLECTIONS) {
    const col = db.collection(c);
    let n = 0;
    for (;;) {
      const ids = (await col.find(MISSING, { projection: { _id: 1 } }).limit(batch).toArray()).map((d) => d._id);
      if (ids.length === 0) break;
      const r = await col.updateMany({ _id: { $in: ids }, ...MISSING }, { $set: { market_id: market.id, operator_id: market.operator_id, [RUN_FIELD]: runId } });
      n += r.modifiedCount;
      if (r.modifiedCount === 0) break; // nothing changed: another writer got there first, do not spin
    }
    written += n;
    per.push({ collection: c, missing: n });
  }
  return { written, run_id: runId, per_collection: per };
}

export interface MarketRollbackRow { collection: string; stamped: number }

/** Undoes exactly one run: unsets market_id, operator_id and the run stamp on the documents that run wrote. Dry run (counts) unless `apply`. */
export async function rollbackMarketBackfill(db: Db, runId: string, opts: { apply?: boolean; collections?: readonly string[] } = {}): Promise<MarketRollbackRow[]> {
  const rows: MarketRollbackRow[] = [];
  for (const c of opts.collections ?? MARKET_BACKFILL_COLLECTIONS) {
    const col = db.collection(c);
    const stamped = await col.countDocuments({ [RUN_FIELD]: runId });
    if (opts.apply && stamped > 0) await col.updateMany({ [RUN_FIELD]: runId }, { $unset: { market_id: '', operator_id: '', [RUN_FIELD]: '' } });
    rows.push({ collection: c, stamped });
  }
  return rows;
}
