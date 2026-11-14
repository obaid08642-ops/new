/**
 * The typed drug-interaction check (web parity: patient-web/components-next/drug-interaction-checker.tsx). The patient lists
 * the medicines they take and POST /ai/drug-interactions answers { checked, safe, interactions[] }. Pure helpers only.
 */

export const IX_MAX_DRUGS = 20;
export const IX_NOTES = ['bleeding_risk', 'lactic_acidosis', 'high_potassium', 'severe_low_blood_pressure', 'rhabdomyolysis'] as const;

export type IxHit = { severity?: string; code?: string; note_ar?: string; note?: string };
export type IxResult = { checked?: number; safe?: boolean; interactions?: IxHit[] };

/** The list after adding `input`: trimmed to 200 characters, at least 2, no case-insensitive duplicate, at most 20. */
export function addDrug(list: string[], input: string): string[] {
  const name = input.trim().slice(0, 200);
  if (name.length < 2 || list.length >= IX_MAX_DRUGS) return list;
  if (list.some((d) => d.toLowerCase() === name.toLowerCase())) return list;
  return [...list, name];
}

/** The three levels the check states; any other word from the server is not drawn as a label. */
export function ixLevel(value?: string): { key: 'pharmacy.scan.ixHigh' | 'pharmacy.scan.ixMedium' | 'pharmacy.scan.ixLow'; tone: 'danger' | 'warning' | 'success' } | null {
  const v = (value || '').toLowerCase();
  if (['high', 'severe', 'major', 'critical', 'contraindicated'].includes(v)) return { key: 'pharmacy.scan.ixHigh', tone: 'danger' };
  if (['moderate', 'medium'].includes(v)) return { key: 'pharmacy.scan.ixMedium', tone: 'warning' };
  if (['low', 'minor', 'mild'].includes(v)) return { key: 'pharmacy.scan.ixLow', tone: 'success' };
  return null;
}

export const isIxNote = (code?: string): boolean => (IX_NOTES as readonly string[]).includes(code ?? '');
