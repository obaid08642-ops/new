/**
 * The price summary of a placed booking (decision 390): the amounts the appointment record itself stores
 * (`price`, `service_fee`, `home_visit_fee`, `transportation_fee`, `total_price`, see backend schemas/appointment.schema.ts).
 * Nothing is added up here: the total is the server's `total_price`, and a line the server stored as 0 or did not send is
 * not drawn.
 */
export interface PriceLine {
  /** Suffix of the translation key `consult.price.<key>`. */
  key: 'fee' | 'service' | 'homeVisit' | 'transport';
  value: number;
}

export interface PriceSummary {
  lines: PriceLine[];
  /** The server's total, null when it did not send a positive one. */
  total: number | null;
  paid: boolean;
}

const positive = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const FIELDS: ReadonlyArray<readonly [PriceLine['key'], string]> = [
  ['fee', 'price'],
  ['service', 'service_fee'],
  ['homeVisit', 'home_visit_fee'],
  ['transport', 'transportation_fee'],
];

export function priceSummary(appointment: Record<string, unknown> | null | undefined): PriceSummary | null {
  if (!appointment) return null;
  const lines: PriceLine[] = [];
  for (const [key, field] of FIELDS) {
    const value = positive(appointment[field]);
    if (value !== null) lines.push({ key, value });
  }
  const total = positive(appointment.total_price);
  if (lines.length === 0 && total === null) return null;
  return { lines, total, paid: appointment.payment_status === 'paid' };
}
