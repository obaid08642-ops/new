/**
 * Generates a short, human-readable tracking code.
 * Format: <PREFIX>-<YYMM>-<5char>
 * Example: RX-2406-A8K2Q
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

export function trackingId(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix.toUpperCase()}-${yy}${mm}-${suffix}`;
}

export const TRACK_PREFIX = {
  order: 'PH',
  appointment: 'APT',
  lab_booking: 'LAB',
  home_care: 'HC',
  prescription: 'RX',
  lab_result: 'RES',
  support: 'SUP',
  radiology_booking: 'RAD',
  radiology_report: 'RPT',
  medical_report: 'MR',
};
