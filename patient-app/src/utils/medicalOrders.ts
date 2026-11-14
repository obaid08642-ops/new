/**
 * M6 "My medical orders" (canvas Ord20/Ord21, app). The doctor's structured order from GET /medical-orders/mine and
 * GET /medical-orders/:id (backend medical-orders.service.ts view()). Nothing is invented: a missing field is left out.
 */

export type OrderGroupKey = 'labs' | 'radiology' | 'nursing' | 'prescription';
export type OrderItemStatus = 'open' | 'ordered' | 'later';

export interface MedicalOrderItem { id: string; group: 'labs' | 'radiology' | 'nursing'; catalog_id: string; status: OrderItemStatus; sessions?: number }
export interface MedicalOrder {
  id: string;
  valid_until: string;
  expired: boolean;
  expires_soon: boolean;
  notes: string | null;
  prescription_id: string | null;
  items: MedicalOrderItem[];
  groups: Partial<Record<OrderGroupKey, { items: MedicalOrderItem[]; prescription_id?: string }>>;
}

const ITEM_STATUS: OrderItemStatus[] = ['open', 'ordered', 'later'];
const GROUPS: OrderGroupKey[] = ['labs', 'radiology', 'nursing', 'prescription'];

type Raw = Record<string, unknown>;

function item(raw: unknown): MedicalOrderItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  if (typeof r.id !== 'string' || typeof r.catalog_id !== 'string') return null;
  if (r.group !== 'labs' && r.group !== 'radiology' && r.group !== 'nursing') return null;
  if (!ITEM_STATUS.includes(r.status as OrderItemStatus)) return null;
  return { id: r.id, group: r.group, catalog_id: r.catalog_id, status: r.status as OrderItemStatus, sessions: typeof r.sessions === 'number' ? r.sessions : undefined };
}

/** One order, or null when the payload has no id or no validity date. */
export function parseOrder(payload: unknown): MedicalOrder | null {
  if (!payload || typeof payload !== 'object') return null;
  const r = payload as Raw;
  if (typeof r.id !== 'string' || typeof r.valid_until !== 'string') return null;
  const items = (Array.isArray(r.items) ? r.items : []).map(item).filter((i): i is MedicalOrderItem => i !== null);
  const groups: MedicalOrder['groups'] = {};
  const raw = (r.groups && typeof r.groups === 'object' ? r.groups : {}) as Raw;
  for (const key of GROUPS) {
    const g = raw[key] as Raw | undefined;
    if (!g) continue;
    const list = (Array.isArray(g.items) ? g.items : []).map(item).filter((i): i is MedicalOrderItem => i !== null);
    groups[key] = { items: list, prescription_id: typeof g.prescription_id === 'string' ? g.prescription_id : undefined };
  }
  return {
    id: r.id,
    valid_until: r.valid_until,
    expired: r.expired === true,
    expires_soon: r.expires_soon === true,
    notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim() : null,
    prescription_id: typeof r.prescription_id === 'string' ? r.prescription_id : null,
    items,
    groups,
  };
}

/** The rows of GET /medical-orders/mine (a bare array or { data }). */
export function parseOrders(payload: unknown): MedicalOrder[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray((payload as Raw | null)?.data) ? ((payload as Raw).data as unknown[]) : [];
  return rows.map(parseOrder).filter((o): o is MedicalOrder => o !== null);
}

/** Where the Order button leads: the flow that already exists for the group. */
export function groupFlow(group: OrderGroupKey, order: MedicalOrder): { pathname: string; params?: Record<string, string> } {
  if (group === 'labs' || group === 'radiology') return { pathname: '/diagnostics/search' };
  if (group === 'nursing') return { pathname: '/nursing' };
  const rx = order.groups.prescription?.prescription_id ?? order.prescription_id;
  return rx ? { pathname: '/pharmacy/rx-order', params: { prescriptionId: rx } } : { pathname: '/pharmacy/request' };
}
