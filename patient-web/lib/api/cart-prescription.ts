/**
 * GET /cart/prescription answers the patient's latest prescription that is not dispensed or archived
 * (backend cart.module.ts): `{ prescription_id, date, medications: [{ id, name, dose, qty, requiresRx, is_manual_entry }] }`,
 * or `{ prescription_id: null, medications: [] }` when there is none. Only what the screen draws is kept.
 */
export type CartPrescription = { id: string; date?: string; medications: Array<{ name: string; dose?: string; quantity?: number }> };

type Row = Record<string, unknown>;
const row = (value: unknown): Row | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null);
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function extractCartPrescription(payload: unknown): CartPrescription | null {
  const root = row(payload);
  const id = text(root?.prescription_id);
  if (!root || !id) return null;
  const medications = (Array.isArray(root.medications) ? root.medications : []).flatMap((entry) => {
    const item = row(entry);
    const name = text(item?.name);
    if (!item || !name) return [];
    const quantity = typeof item.qty === "number" && Number.isFinite(item.qty) && item.qty >= 1 ? item.qty : undefined;
    return [{ name, dose: text(item.dose), quantity }];
  });
  return { id, date: text(root.date), medications };
}
