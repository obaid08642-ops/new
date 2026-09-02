import { z } from "zod";

const prescriptionIdSchema = z.string().uuid();

export type PrescriptionDetailItem = {
  name: string | null;
  dose: string | null;
  frequency: { every_hours?: number; times_per_day?: number } | null;
  duration: number | null;
};

export type PrescriptionDetail = {
  id: string;
  status: string;
  items: PrescriptionDetailItem[];
  issuedAt: string | null;
  doctor: {
    displayName: string | null;
    specialty: string | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extractPrescriptionDetail(payload: unknown): PrescriptionDetail | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data) || root;
  if (!data) return null;

  const idResult = prescriptionIdSchema.safeParse(data.id);
  if (!idResult.success) return null;

  const status = typeof data.status === "string" ? data.status : "UNKNOWN";
  const issuedAt = typeof data.issued_at === "string" ? data.issued_at : null;

  const doctorRec = asRecord(data.doctor);
  const doctor = {
    displayName: typeof doctorRec?.display_name === "string" ? doctorRec.display_name : null,
    specialty: typeof doctorRec?.specialty === "string" ? doctorRec.specialty : null,
  };

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: PrescriptionDetailItem[] = rawItems.map((raw) => {
    const rec = asRecord(raw);
    const name = typeof rec?.name === "string" ? rec.name : null;
    const dose = typeof rec?.dose === "string" ? rec.dose : null;
    const freqRec = asRecord(rec?.frequency);
    const frequency = freqRec
      ? {
          every_hours: typeof freqRec.every_hours === "number" ? freqRec.every_hours : undefined,
          times_per_day: typeof freqRec.times_per_day === "number" ? freqRec.times_per_day : undefined,
        }
      : null;
    const duration = typeof rec?.duration === "number" ? rec.duration : null;

    return { name, dose, frequency, duration };
  });

  return {
    id: idResult.data,
    status,
    items,
    issuedAt,
    doctor,
  };
}
