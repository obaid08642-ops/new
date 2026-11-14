import { fromHalalas } from '../../common/money';

/**
 * Commission figures from the REAL ledger rows (screens-audit-3 gap 23).
 *
 * The admin commissions page and the provider summary read `FinanceCoreService.accrue()`'s own table (rows with state ACCRUED), but nothing ever
 * calls `accrue()`: the settlement credits each completed service as a `provider_earning` row (gross, commission, vat, amount = the provider's net, ref_type)
 * and each refund takes part of the commission and its VAT back as `commission_reversal` / `vat_reversal` rows (meta.earning_id points to the earning).
 * So the KPIs stayed at zero. They now add those rows, in whole halalas (the integer shadow when the row has one, the double times 100 rounded otherwise).
 * `accrue()` itself is left alone: it writes another row shape into the same collection and must not be called from the payment path.
 */

/** `$ifNull: [<field>_halalas, round(<field> * 100)]`: one money field as whole halalas inside an aggregation. */
export const halalasOf = (field: string) => ({ $ifNull: [`$${field}_halalas`, { $toLong: { $round: [{ $multiply: [`$${field}`, 100] }, 0] } }] });

/** The earnings of every service (or of one provider's accounts), grouped by what was served (`ref_type`). */
export function earningsPipeline(providerAccountIds?: string[]) {
  const match: Record<string, unknown> = { type: 'provider_earning' };
  if (providerAccountIds) match.provider_account_id = { $in: providerAccountIds };
  return [
    { $match: match },
    { $group: { _id: '$ref_type', gross: { $sum: halalasOf('gross') }, commission: { $sum: halalasOf('commission') }, vat: { $sum: halalasOf('vat') }, net: { $sum: halalasOf('amount') }, count: { $sum: 1 } } },
  ];
}

/** What refunds took back, grouped by the served thing of the earning they belong to (`unknown` when the earning cannot be found). */
export function reversalsPipeline() {
  return [
    { $match: { type: { $in: ['commission_reversal', 'vat_reversal'] } } },
    { $lookup: { from: 'platformledgerentries', localField: 'meta.earning_id', foreignField: 'id', as: 'earning' } },
    { $group: { _id: { service: { $ifNull: [{ $arrayElemAt: ['$earning.ref_type', 0] }, 'unknown'] }, type: '$type' }, total: { $sum: halalasOf('amount') } } },
  ];
}

export interface EarningGroup { _id: string | null; gross?: number; commission?: number; vat?: number; net?: number; count?: number }
export interface ReversalGroup { _id: { service: string; type: string }; total?: number }

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * The platform commissions KPI. Same shape as before (`total_commission`, `by_service: [{ _id, gross, commission, count }]`) plus the VAT on the commission.
 * Commission and VAT are NET of what refunds reversed: a refunded order earned the platform nothing (the finance report subtracts them the same way).
 */
export function foldPlatformSummary(earnings: EarningGroup[], reversals: ReversalGroup[]) {
  const rev = (service: string, type: string) => reversals.filter((r) => r._id?.service === service && r._id?.type === type).reduce((s, r) => s + n(r.total), 0);
  const services = new Set<string>([...earnings.map((e) => String(e._id ?? 'unknown')), ...reversals.map((r) => r._id?.service ?? 'unknown')]);
  const by_service = [...services].sort().map((service) => {
    const rows = earnings.filter((e) => String(e._id ?? 'unknown') === service);
    const sum = (k: keyof EarningGroup) => rows.reduce((s, e) => s + n(e[k]), 0);
    return {
      _id: service,
      gross: fromHalalas(sum('gross')),
      commission: fromHalalas(sum('commission') - rev(service, 'commission_reversal')),
      vat_on_commission: fromHalalas(sum('vat') - rev(service, 'vat_reversal')),
      count: sum('count'),
    };
  });
  const total = (k: 'commission' | 'vat_on_commission') => by_service.reduce((s, r) => s + Math.round(r[k] * 100), 0);
  return { total_commission: fromHalalas(total('commission')), total_vat_on_commission: fromHalalas(total('vat_on_commission')), by_service };
}

/** One provider's summary: what they were credited (gross, commission taken, their net) and how many services. */
export function foldProviderSummary(earnings: EarningGroup[]) {
  const sum = (k: keyof EarningGroup) => earnings.reduce((s, e) => s + n(e[k]), 0);
  return { gross: fromHalalas(sum('gross')), commission: fromHalalas(sum('commission')), net: fromHalalas(sum('net')), count: sum('count') };
}

/** What kind of provider an earning's `ref_type` belongs to, in the words the legacy commission list used. */
export function providerTypeOf(refType: string | undefined): string {
  const t = String(refType || '');
  if (t === 'appointment') return 'doctor';
  if (t === 'homecare_booking') return 'home_care';
  if (t.startsWith('pharmacy') || t === 'order') return 'pharmacy';
  return t || 'unknown';
}

/** One earning row as a per-transaction commission record, with the field names of the legacy list the admin page reads. */
export function earningRecord(row: any, providerName?: string) {
  return {
    id: row.id,
    providerId: row.provider_account_id,
    providerName: providerName || undefined,
    providerType: providerTypeOf(row.ref_type),
    refType: row.ref_type,
    refId: row.ref_id,
    baseBill: n(row.gross),
    systemCommission: n(row.commission),
    vatOnCommission: n(row.vat),
    providerEarning: n(row.amount),
    commissionPercent: row.commission_percent,
    createdAt: row.createdAt,
  };
}
