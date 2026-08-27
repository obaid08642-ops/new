export type PrescriptionLine = { medicine_id?: string; medicine_name_ar?: string; medicine_name_en?: string; name?: string; quantity?: number; qty?: number; [key: string]: unknown };
export type PatientPrescription = { id?: string; items?: PrescriptionLine[] };

export function mapPrescriptionToPharmacyDraftLines(prescription: PatientPrescription) {
  return (prescription?.items || []).map((line, index) => ({
    id: String(line.medicine_id || `${prescription?.id || 'prescription'}-line-${index}`),
    sku: line.medicine_id ? String(line.medicine_id) : undefined,
    name: String(line.medicine_name_ar || line.medicine_name_en || line.name || '').trim(),
    qty: Math.max(1, Number(line.quantity ?? line.qty) || 1),
    intake_source: 'prescription',
  })).filter((line) => line.name);
}
