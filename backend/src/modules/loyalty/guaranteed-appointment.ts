/**
 * "Guaranteed appointment" (owner decision 2026-10-24): a clinic or video appointment that starts more than 30 minutes after
 * its slot, for a reason on the doctor's side, earns the patient a small Nabdat credit (once per appointment, 20 points unless
 * the admin sets another value in loyalty config earn_points.appointment_delay_credit, under the existing earning caps).
 *
 * Doctor-side delay = the start minus the LATER of the slot and the patient's check-in, so a patient who arrived late never
 * earns it. A clinic visit with no check-in on record cannot prove the patient was there, so it earns nothing.
 */
export const DELAY_CREDIT_AFTER_MINUTES = 30;
export const DELAY_CREDIT_REASON = 'appointment_delay_credit';
export const DELAY_CREDIT_DEFAULT_POINTS = 20;

export interface StartedAppointment {
  service_type?: string;
  slot_start?: Date | string | null;
  checked_in_at?: Date | string | null;
  started_at?: Date | string | null;
}

const ms = (v: unknown): number | null => {
  const t = v instanceof Date ? v.getTime() : typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

/** Minutes of doctor-side delay, or null when the appointment does not qualify to be measured. */
export function doctorSideDelayMinutes(a: StartedAppointment): number | null {
  if (a?.service_type !== 'clinic' && a?.service_type !== 'video') return null;
  const slot = ms(a.slot_start);
  const started = ms(a.started_at);
  if (slot === null || started === null) return null;
  const checkedIn = ms(a.checked_in_at);
  if (a.service_type === 'clinic' && checkedIn === null) return null;
  const base = checkedIn === null ? slot : Math.max(slot, checkedIn);
  return (started - base) / 60_000;
}

export const qualifiesForDelayCredit = (a: StartedAppointment): boolean => {
  const d = doctorSideDelayMinutes(a);
  return d !== null && d > DELAY_CREDIT_AFTER_MINUTES;
};

/** The notification text in the patient's own language (six languages; anything else gets English). */
export const DELAY_CREDIT_TEXT: Record<'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil', { title: string; body: string }> = {
  ar: { title: 'موعد مضمون: رصيد نبضات هدية', body: 'تأخّر موعدك أكثر من 30 دقيقة عن وقته بسبب الطبيب. أضفنا {points} نقطة إلى رصيدك اعتذاراً عن الانتظار.' },
  en: { title: 'Guaranteed appointment: Nabdat credit', body: 'Your appointment started more than 30 minutes late because of the doctor. We added {points} points to your balance for the wait.' },
  ur: { title: 'یقینی اپائنٹمنٹ: نبضات کریڈٹ', body: 'ڈاکٹر کی وجہ سے آپ کی اپائنٹمنٹ 30 منٹ سے زیادہ تاخیر سے شروع ہوئی۔ انتظار کے بدلے ہم نے آپ کے اکاؤنٹ میں {points} پوائنٹس شامل کیے۔' },
  hi: { title: 'गारंटीड अपॉइंटमेंट: नबदात क्रेडिट', body: 'डॉक्टर की ओर से आपकी अपॉइंटमेंट 30 मिनट से अधिक देर से शुरू हुई। इंतज़ार के बदले हमने आपके बैलेंस में {points} पॉइंट जोड़ दिए हैं।' },
  bn: { title: 'নিশ্চিত অ্যাপয়েন্টমেন্ট: নাবদাত ক্রেডিট', body: 'ডাক্তারের কারণে আপনার অ্যাপয়েন্টমেন্ট ৩০ মিনিটের বেশি দেরিতে শুরু হয়েছে। অপেক্ষার জন্য আমরা আপনার ব্যালেন্সে {points} পয়েন্ট যোগ করেছি।' },
  fil: { title: 'Garantisadong appointment: Nabdat credit', body: 'Mahigit 30 minuto nang huli nagsimula ang appointment mo dahil sa doktor. Nagdagdag kami ng {points} puntos sa balanse mo bilang kabayaran sa paghihintay.' },
};

export function delayCreditText(locale: unknown, points: number): { title: string; body: string } {
  const raw = String(locale ?? '').toLowerCase().split(/[-_]/)[0];
  const lang = (raw === 'tl' ? 'fil' : raw) as keyof typeof DELAY_CREDIT_TEXT;
  const t = DELAY_CREDIT_TEXT[lang] ?? DELAY_CREDIT_TEXT.en;
  return { title: t.title, body: t.body.replace('{points}', String(points)) };
}
