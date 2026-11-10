import { fromHalalas, percentOf, toHalalas } from '../../common/money';
import { DEFAULT_REFUND_POLICY } from '../refund-policy/refund-policy.defaults';
import { consultationRefundWindow } from './consultation-refund-table';

/**
 * The two refund-policy fields the admin screen stores (`system_configs {key:'refund_policy'}`) and the cancel listeners now read
 * (screens-audit-3 gap 24): `home_visit.patient_absent_percent` and `pharmacy.refund_delivery_fee_before_dispatch`.
 * Pure and in whole halalas, so it is tested without a database.
 */

/** The share (0..100) of a home visit's price refunded when the patient is not there. A missing or invalid value is the default (0: nothing). */
export function patientAbsentPercent(policy: any): number {
  const v = policy?.home_visit?.patient_absent_percent;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : DEFAULT_REFUND_POLICY.home_visit.patient_absent_percent;
}

/** Whether a pharmacy order cancelled before dispatch gets its delivery fee back. A missing or non-boolean value is the default (yes). */
export function refundsDeliveryFeeBeforeDispatch(policy: any): boolean {
  const v = policy?.pharmacy?.refund_delivery_fee_before_dispatch;
  return typeof v === 'boolean' ? v : DEFAULT_REFUND_POLICY.pharmacy.refund_delivery_fee_before_dispatch;
}

/**
 * What a cancelled pharmacy order gets back (SAR). Once the order is out for delivery the delivery fee is kept; before dispatch it is
 * refunded too, unless the policy says it is not. Never below zero, and never more than the total.
 */
export function pharmacyCancelRefund(totalSar: number, deliveryFeeSar: number, dispatched: boolean, refundFeeBeforeDispatch: boolean): number {
  const total = Number.isFinite(totalSar) ? Math.max(0, toHalalas(totalSar)) : 0;
  const fee = Number.isFinite(deliveryFeeSar) ? Math.min(total, Math.max(0, toHalalas(deliveryFeeSar))) : 0;
  const keepsFee = dispatched || !refundFeeBeforeDispatch;
  return fromHalalas(keepsFee ? total - fee : total);
}

/** The refund for a home visit the patient was absent from: the policy percent of what was paid, in whole halalas (half away from zero). */
export function patientAbsentRefund(totalSar: number, percent: number): number {
  const total = Number.isFinite(totalSar) ? Math.max(0, toHalalas(totalSar)) : 0;
  return fromHalalas(percentOf(total, Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0))));
}


/**
 * Owner decision 2026-11-10: the 2-hour table of the consultation (`full_refund_min_hours` or more before the start = 100 %, later but before the start = `late_refund_percent`) also
 * applies when a PATIENT cancels a lab, radiology or nursing booking. Provider cancels and a provider no-show stay 100 % (the caller does not use this for them).
 * A booking asked for "as soon as possible" has no appointment to be early for: it keeps the earlier rule (everything back until the provider is on the way). After the collector
 * / nurse set off (`afterTransit`) the trip fee of the policy is never refunded, on top of the table (the refund is capped at the total minus the trip fee).
 */
export function visitPatientCancelRefund(totalSar: number, scheduledAt: Date | string | undefined, policy: any, o: { afterTransit: boolean; tripFeeSar: number; asap?: boolean }, nowMs: number = Date.now()): number {
  const total = Number.isFinite(totalSar) ? Math.max(0, toHalalas(totalSar)) : 0;
  const percent = o.asap ? 100 : consultationRefundWindow(scheduledAt ? new Date(scheduledAt) : undefined, policy, nowMs).percent;
  let amount = percentOf(total, Math.min(100, Math.max(0, percent)));
  if (o.afterTransit) amount = Math.min(amount, Math.max(0, total - Math.max(0, Number.isFinite(o.tripFeeSar) ? toHalalas(o.tripFeeSar) : 0)));
  return fromHalalas(Math.max(0, amount));
}
