/**
 * The prescription API (GET /prescriptions/active) returns `items` [{ medicine_id?, medicine_name_ar/en, dose, duration_days,
 * instructions }] without item ids. The appointment page needs stable ids and display fields, and the body POST /health/reminders
 * accepts. Same reading as the app's (patient-app/src/utils/prescription-view.ts).
 */
export type MedicationView = {
  id: string;
  medicineId?: string;
  name: string;
  nameEn?: string;
  dose: string;
  durationDays?: number;
  instruction: string;
};

type Raw = Record<string, unknown>;
const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function toMedicationViews(rx: unknown): MedicationView[] {
  const root = rx && typeof rx === "object" ? (rx as Raw) : null;
  const items = Array.isArray(root?.items) ? root.items : Array.isArray(root?.medications) ? root.medications : [];
  return (items as unknown[]).flatMap((value, index) => {
    const it = value && typeof value === "object" ? (value as Raw) : null;
    if (!it || it.is_deleted) return [];
    const days = Number(it.duration_days);
    const name = asText(it.medicine_name_ar) || asText(it.medicine_name_en) || asText(it.name) || asText(it.name_ar);
    if (!name) return [];
    return [
      {
        id: asText(it.id) || `${asText(root?.id) || "rx"}-${index}`,
        medicineId: asText(it.medicine_id) || undefined,
        name,
        nameEn: asText(it.medicine_name_en) || undefined,
        dose: asText(it.dose) || asText(it.dosage),
        durationDays: Number.isFinite(days) && days > 0 ? days : undefined,
        instruction: asText(it.instructions) || asText(it.instruction),
      },
    ];
  });
}

/** Dose times from the doctor's instruction ("كل 8 ساعات", "مرتين يومياً", "every 12 hours"); default once at 08:00. */
export function dosingTimes(instruction: string): string[] {
  const t = String(instruction || "").toLowerCase();
  const every = t.match(/كل\s*(\d{1,2})\s*ساع/) || t.match(/every\s*(\d{1,2})\s*h/);
  const hours = every ? Number(every[1]) : /ثلاث|3 times|three times|tid/.test(t) ? 8 : /مرتين|twice|2 times|bid/.test(t) ? 12 : /أربع|4 times|qid/.test(t) ? 6 : 24;
  if (!(hours >= 4 && hours <= 24)) return ["08:00"];
  const out: string[] = [];
  for (let h = 8; out.length < Math.round(24 / hours); h += hours) out.push(`${String(h % 24).padStart(2, "0")}:00`);
  return [...new Set(out)].sort();
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Riyadh";
  } catch {
    return "Asia/Riyadh";
  }
}

/** POST /health/reminders body for one prescribed medicine (the server requires name, dose, times and an IANA time zone). */
export function reminderPayload(med: MedicationView, prescriptionId?: string) {
  return {
    times: dosingTimes(med.instruction),
    time_zone: deviceTimeZone(),
    medication_name: med.name,
    medicine_name_en: med.nameEn,
    medicine_id: med.medicineId,
    dose: med.dose,
    frequency: "daily",
    duration_days: med.durationDays,
    instructions_ar: med.instruction || undefined,
    prescription_id: prescriptionId,
    source: "doctor",
  };
}
