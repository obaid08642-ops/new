// GET /admin/providers/license-expiry rows: who must renew a licence, soonest first.

export interface LicenseExpiryRow {
  id: string; type?: string; display_name_ar?: string; display_name_en?: string; status?: string; license_status?: string;
  license_expiry_date: string; suspended_reason?: string; days_left: number; expired: boolean;
}

export const WINDOWS = [30, 60, 90, 180] as const;

/** The state of one row: expired, due within 7 days, or just upcoming. */
export function expiryState(row: Pick<LicenseExpiryRow, 'days_left' | 'expired'>): 'expired' | 'urgent' | 'upcoming' {
  if (row.expired) return 'expired';
  return row.days_left <= 7 ? 'urgent' : 'upcoming';
}

export function expiryText(row: Pick<LicenseExpiryRow, 'days_left' | 'expired'>): string {
  if (row.expired) return `منتهٍ منذ ${Math.max(1, Math.abs(row.days_left))} يوم`;
  return row.days_left === 0 ? 'ينتهي اليوم' : `يتبقى ${row.days_left} يوم`;
}
