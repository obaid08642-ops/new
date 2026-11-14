// Nursing booking modes (backend/src/modules/home-care/booking-mode.ts): the mode of a catalogue row and the options that mode allows.

export type BookingMode = 'visit' | 'continuous' | 'programme';
export type OptionKey = 'recurrence' | 'hours' | 'shift' | 'period' | 'sessions';
export type BookingOptions = Partial<Record<OptionKey, Array<string | number>>>;

export const MODES: Array<{ key: BookingMode; label: string; hint: string }> = [
  { key: 'visit', label: 'زيارة واحدة', hint: 'زيارة واحدة مع تكرار اختياري' },
  { key: 'continuous', label: 'رعاية مستمرة', hint: 'ساعات ووردية وفترة' },
  { key: 'programme', label: 'برنامج جلسات', hint: 'عدد جلسات من قائمة' },
];

export const OPTION_VALUES: Record<OptionKey, { label: string; values: Array<string | number>; names?: Record<string, string> }> = {
  recurrence: { label: 'التكرار', values: ['once', 'daily', 'weekly', 'monthly'], names: { once: 'مرة واحدة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' } },
  hours: { label: 'الساعات', values: [4, 8, 12, 24] },
  shift: { label: 'الوردية', values: ['day', 'night'], names: { day: 'نهارية', night: 'ليلية' } },
  period: { label: 'الفترة', values: ['day', 'week', 'month', 'open'], names: { day: 'يوم', week: 'أسبوع', month: 'شهر', open: 'مفتوحة' } },
  sessions: { label: 'عدد الجلسات', values: [4, 6, 8, 10, 12] },
};

/** The option groups each mode uses; the rest are never sent. */
export const MODE_OPTIONS: Record<BookingMode, OptionKey[]> = {
  visit: ['recurrence'],
  continuous: ['hours', 'shift', 'period'],
  programme: ['sessions'],
};

export function modeOf(v: unknown): BookingMode {
  return v === 'continuous' || v === 'programme' ? v : 'visit';
}

/** The options to send for a mode: only that mode's groups, only known values, in catalogue order. */
export function cleanOptions(mode: BookingMode, options: BookingOptions | undefined): BookingOptions {
  const out: BookingOptions = {};
  for (const k of MODE_OPTIONS[mode]) {
    const known = OPTION_VALUES[k].values;
    const picked = (options?.[k] ?? []).filter((x) => known.includes(x as never));
    out[k] = known.filter((x) => picked.includes(x));
  }
  return out;
}

export function toggleOption(options: BookingOptions | undefined, key: OptionKey, value: string | number): BookingOptions {
  const cur = options?.[key] ?? [];
  return { ...options, [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
}

/** null = fine. A mode with a group left empty offers the patient nothing to choose (the server then accepts anything), so ask for at least one. */
export function optionsError(mode: BookingMode, options: BookingOptions | undefined): string | null {
  const cleaned = cleanOptions(mode, options);
  const empty = MODE_OPTIONS[mode].find((k) => !(cleaned[k] ?? []).length);
  return empty ? `اختر قيمة واحدة على الأقل: ${OPTION_VALUES[empty].label}` : null;
}
