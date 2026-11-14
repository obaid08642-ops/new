// What the patient chose when booking a nursing service (backend home-care/booking-mode.ts): one line the nurse reads before accepting.

export interface BookingChoiceFields {
  booking_mode?: string; recurrence?: string; hours?: number; shift?: string; period?: string; sessions_count?: number;
}

const RECURRENCE = { once: ['مرة واحدة', 'Once'], daily: ['يوميًا', 'Daily'], weekly: ['أسبوعيًا', 'Weekly'], monthly: ['شهريًا', 'Monthly'] } as const;
const SHIFT = { day: ['نهارية', 'day shift'], night: ['ليلية', 'night shift'] } as const;
const PERIOD = { day: ['يوم', 'per day'], week: ['أسبوع', 'per week'], month: ['شهر', 'per month'], open: ['مفتوحة', 'open-ended'] } as const;

const pick = <T extends Record<string, readonly [string, string]>>(map: T, key: unknown, ar: boolean): string | null => {
  const v = typeof key === 'string' ? (map as Record<string, readonly [string, string]>)[key] : undefined;
  return v ? (ar ? v[0] : v[1]) : null;
};

/** null when the booking carries no choice (an older booking, or a plain single visit). */
export function bookingChoiceLine(b: BookingChoiceFields | null | undefined, ar: boolean): string | null {
  if (!b) return null;
  if (b.booking_mode === 'continuous') {
    const parts = [
      typeof b.hours === 'number' ? (ar ? `${b.hours} ساعة` : `${b.hours} h`) : null,
      pick(SHIFT, b.shift, ar),
      pick(PERIOD, b.period, ar),
    ].filter(Boolean);
    return `${ar ? 'رعاية مستمرة' : 'Continuous care'}${parts.length ? `: ${parts.join(' · ')}` : ''}`;
  }
  if (b.booking_mode === 'programme') {
    const n = Number(b.sessions_count);
    return `${ar ? 'برنامج' : 'Programme'}${n > 0 ? `: ${ar ? `${n} جلسات` : `${n} sessions`}` : ''}`;
  }
  if (b.booking_mode === 'visit') {
    const rec = b.recurrence && b.recurrence !== 'once' ? pick(RECURRENCE, b.recurrence, ar) : null;
    return rec ? `${ar ? 'زيارة متكررة' : 'Recurring visit'}: ${rec}` : null;
  }
  return null;
}
