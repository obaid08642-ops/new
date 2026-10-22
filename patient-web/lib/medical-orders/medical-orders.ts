/**
 * M6 "My medical orders" (canvas Ord20/Ord21). The doctor's structured order from GET /medical-orders/mine?active=1 and
 * GET /medical-orders/:id (backend medical-orders.service.ts view()): items per group, the `expired` and `expires_soon` flags.
 * Nothing here invents a value: a missing field is left out, never filled in.
 */

export type OrderGroupKey = "labs" | "radiology" | "nursing" | "prescription";
export type OrderItemStatus = "open" | "ordered" | "later";

export type MedicalOrderItem = { id: string; group: "labs" | "radiology" | "nursing"; catalog_id: string; status: OrderItemStatus; sessions?: number; interval_days?: number | null };
export type MedicalOrder = {
  id: string;
  status: string;
  valid_days: number;
  valid_until: string;
  expired: boolean;
  expires_soon: boolean;
  notes: string | null;
  appointment_id: string;
  prescription_id: string | null;
  items: MedicalOrderItem[];
  groups: Partial<Record<OrderGroupKey, { items?: MedicalOrderItem[]; prescription_id?: string }>>;
};

type Raw = Record<string, unknown>;

const GROUP_KEYS: OrderGroupKey[] = ["labs", "radiology", "nursing", "prescription"];
const ITEM_STATUS: OrderItemStatus[] = ["open", "ordered", "later"];

function rowsOf(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload.filter((r): r is Raw => !!r && typeof r === "object");
  const data = (payload as Raw | null)?.data;
  return Array.isArray(data) ? data.filter((r): r is Raw => !!r && typeof r === "object") : [];
}

function item(raw: unknown): MedicalOrderItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Raw;
  const group = r.group;
  const status = r.status;
  if (typeof r.id !== "string" || typeof r.catalog_id !== "string") return null;
  if (group !== "labs" && group !== "radiology" && group !== "nursing") return null;
  if (!ITEM_STATUS.includes(status as OrderItemStatus)) return null;
  return {
    id: r.id,
    group,
    catalog_id: r.catalog_id,
    status: status as OrderItemStatus,
    sessions: typeof r.sessions === "number" ? r.sessions : undefined,
    interval_days: typeof r.interval_days === "number" ? r.interval_days : null,
  };
}

/** One order, or null when the payload is not an order. */
export function orderOf(payload: unknown): MedicalOrder | null {
  if (!payload || typeof payload !== "object") return null;
  const r = payload as Raw;
  if (typeof r.id !== "string" || typeof r.valid_until !== "string") return null;
  const items = (Array.isArray(r.items) ? r.items : []).map(item).filter((i): i is MedicalOrderItem => i !== null);
  const groups: MedicalOrder["groups"] = {};
  const rawGroups = (r.groups && typeof r.groups === "object" ? r.groups : {}) as Raw;
  for (const key of GROUP_KEYS) {
    const g = rawGroups[key] as Raw | undefined;
    if (!g) continue;
    groups[key] = {
      items: Array.isArray(g.items) ? (g.items as unknown[]).map(item).filter((i): i is MedicalOrderItem => i !== null) : undefined,
      prescription_id: typeof g.prescription_id === "string" ? g.prescription_id : undefined,
    };
  }
  return {
    id: r.id,
    status: typeof r.status === "string" ? r.status : "active",
    valid_days: typeof r.valid_days === "number" ? r.valid_days : 0,
    valid_until: r.valid_until,
    expired: r.expired === true,
    expires_soon: r.expires_soon === true,
    notes: typeof r.notes === "string" && r.notes.trim() ? r.notes.trim() : null,
    appointment_id: typeof r.appointment_id === "string" ? r.appointment_id : "",
    prescription_id: typeof r.prescription_id === "string" ? r.prescription_id : null,
    items,
    groups,
  };
}

export function ordersOf(payload: unknown): MedicalOrder[] {
  return rowsOf(payload).map(orderOf).filter((o): o is MedicalOrder => o !== null);
}

/** Where the Order button of a group leads: the existing flow for that kind of service. */
export function groupFlowHref(locale: string, group: OrderGroupKey, order: MedicalOrder): string {
  if (group === "labs") return `/${locale}/diagnostics?kind=labs`;
  if (group === "radiology") return `/${locale}/diagnostics?kind=radiology`;
  if (group === "nursing") return `/${locale}/nursing`;
  const rx = order.groups.prescription?.prescription_id;
  return rx ? `/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(rx)}` : `/${locale}/pharmacy/request`;
}
