/**
 * Order again (Batch 1e): the lines of an earlier pharmacy order, as GET /patient/pharmacy/orders/:id returns them
 * (`items[]`: `id`, `raw_name` / `name_ar` / `name_en`, `qty`, `matched_sku`), and the body of the new request.
 *
 * Only lines the server returned are offered, with the quantity it stored. The earlier prices, payment method and
 * insurance are not carried (the request goes out for new offers). A line sends a `sku` only when the earlier order had
 * matched one: the order item's own id is not a product code and is never sent as one.
 */
import type { DeliveryAddress } from './pharmacy-draft';

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

export interface ReorderLine {
  /** The earlier order item's id (only a key for the list). */
  key: string;
  /** The product code the earlier order had matched; null when it had none. */
  sku: string | null;
  name: string;
  qty: number;
  selected: boolean;
}

export function readReorderLines(response: unknown): ReorderLine[] {
  const root = response && typeof response === 'object' ? (response as Record<string, unknown>) : null;
  const order = (root?.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root) ?? {};
  const items = Array.isArray(order.items) ? order.items : [];
  return items.flatMap((item, i): ReorderLine[] => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    const name = text(o.raw_name) ?? text(o.name_ar) ?? text(o.name_en);
    if (!name) return [];
    const qty = Number(o.qty);
    return [{ key: text(o.id) ?? `line-${i}`, sku: text(o.matched_sku), name, qty: Math.min(99, Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1))), selected: true }];
  });
}

type DraftItem = { raw_name: string; qty: number; sku?: string; intake_source: string };

/** The request body for the lines kept, with the delivery address; a line without a matched code carries no `sku`. */
export function reorderBody<D extends { items: DraftItem[] }>(
  lines: ReorderLine[],
  address: DeliveryAddress,
  build: (items: Array<{ id: string; sku?: string; name: string; qty: number; intake_source: string }>, address: DeliveryAddress) => D,
): D {
  const draft = build(lines.map((l) => ({ id: l.key, sku: l.sku ?? undefined, name: l.name, qty: l.qty, intake_source: 'cart' })), address);
  // the builder falls back to the line id for the code; an order item id is not one
  return { ...draft, items: draft.items.map((item, i): DraftItem => (lines[i].sku ? item : { ...item, sku: undefined })) };
}
