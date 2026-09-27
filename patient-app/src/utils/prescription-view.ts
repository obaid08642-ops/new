/**
 * The prescription API (GET /prescriptions/active) returns `items`
 * [{ medicine_id?, medicine_name_ar/en, dose, duration_days, instructions }] without item ids.
 * The patient screen needs stable ids and display fields, and the reminder payload POST /health/reminders accepts.
 */
export interface MedicationView {
  id: string;
  medicine_id?: string;
  name: string;
  name_en?: string;
  dose: string;
  duration: string;
  duration_days?: number;
  instruction: string;
}

export function toMedicationViews(rx: any): MedicationView[] {
  const items = Array.isArray(rx?.items) ? rx.items : Array.isArray(rx?.medications) ? rx.medications : [];
  return items
    .filter((it: any) => it && !it.is_deleted)
    .map((it: any, i: number) => {
      const days = Number(it.duration_days);
      return {
        id: String(it.id || `${rx?.id || 'rx'}-${i}`),
        medicine_id: it.medicine_id || undefined,
        name: String(it.medicine_name_ar || it.medicine_name_en || it.name || '').trim(),
        name_en: it.medicine_name_en || undefined,
        dose: String(it.dose || it.dosage || '').trim(),
        duration: Number.isFinite(days) && days > 0 ? `${days} يوم` : '',
        duration_days: Number.isFinite(days) && days > 0 ? days : undefined,
        instruction: String(it.instructions || it.instruction || '').trim(),
      };
    })
    .filter((m: MedicationView) => m.name);
}

/** Dose times from the doctor's instruction ("كل 8 ساعات", "مرتين يومياً", "every 12 hours"); default once at 08:00. */
export function dosingTimes(instruction: string): string[] {
  const t = String(instruction || '').toLowerCase();
  const every = t.match(/كل\s*(\d{1,2})\s*ساع/) || t.match(/every\s*(\d{1,2})\s*h/);
  const hours = every ? Number(every[1]) : /ثلاث|3 times|three times|tid/.test(t) ? 8 : /مرتين|twice|2 times|bid/.test(t) ? 12 : /أربع|4 times|qid/.test(t) ? 6 : 24;
  if (!(hours >= 4 && hours <= 24)) return ['08:00'];
  const out: string[] = [];
  for (let h = 8; out.length < Math.round(24 / hours); h += hours) out.push(`${String(h % 24).padStart(2, '0')}:00`);
  return [...new Set(out)].sort();
}

function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh'; } catch { return 'Asia/Riyadh'; }
}

/** POST /health/reminders body for one prescribed medicine (server requires name, dose, times and an IANA time zone). */
export function reminderPayload(med: MedicationView, prescriptionId?: string) {
  return {
    times: dosingTimes(med.instruction),
    time_zone: deviceTimeZone(),
    medication_name: med.name,
    medicine_name_en: med.name_en,
    medicine_id: med.medicine_id,
    dose: med.dose,
    frequency: 'daily',
    duration_days: med.duration_days,
    instructions_ar: med.instruction || undefined,
    prescription_id: prescriptionId,
    source: 'doctor',
  };
}
