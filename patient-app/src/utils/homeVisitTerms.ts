/** Journeys 66 (decision 26): the home-visit cancellation sentences from the server's refund policy (GET /refund-policy). */
export interface RefundPolicy { home_visit?: { trip_fee_sar?: number; patient_absent_percent?: number } }

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function homeVisitTermLines(policy: RefundPolicy | null, k: (key: string, vars?: Record<string, string | number>) => string, money: (amount: number) => string): string[] {
  const h = policy?.home_visit;
  if (!h) return [];
  const lines = [k('nur.terms.beforeOnTheWay')];
  if (isNumber(h.trip_fee_sar)) lines.push(k('nur.terms.afterOnTheWay', { fee: money(h.trip_fee_sar) }));
  if (isNumber(h.patient_absent_percent)) lines.push(k('nur.terms.absent', { percent: h.patient_absent_percent }));
  return lines;
}

