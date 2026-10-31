/** POST /ordering/bookings answer (backend ordering.service.ts `book`): one group, one booking per mode, one payment amount. */
import type { Coverage, OrderMode } from "./quote";

export type OrderingBooking = { id: string; /** which booking service made it; absent means a lab booking */ kind?: "lab" | "radiology"; mode: OrderMode; status: string; providerId: string; total: number; items: Array<{ catalogId: string; price: number; coverage?: Coverage }> };
export type OrderingBookingResult = { orderGroupId: string; bookings: OrderingBooking[]; payment: { amount: number; status: string } };

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);

export function parseBookingResult(payload: unknown): OrderingBookingResult | null {
  const r = obj(payload);
  const groupId = r && typeof r.order_group_id === "string" ? r.order_group_id : null;
  const pay = r && obj(r.payment);
  if (!r || !groupId || !pay || typeof pay.amount !== "number" || !Array.isArray(r.bookings)) return null;
  const bookings = r.bookings.flatMap((b): OrderingBooking[] => {
    const x = obj(b);
    if (!x || typeof x.id !== "string" || (x.mode !== "home" && x.mode !== "facility") || typeof x.total !== "number" || typeof x.provider_id !== "string") return [];
    const items = (Array.isArray(x.items) ? x.items : []).flatMap((i) => {
      const l = obj(i);
      return l && typeof l.catalog_id === "string" && typeof l.price === "number"
        ? [{ catalogId: l.catalog_id, price: l.price, ...(typeof l.coverage === "string" ? { coverage: l.coverage as Coverage } : {}) }]
        : [];
    });
    return [{ id: x.id, mode: x.mode, status: typeof x.status === "string" ? x.status : "pending", providerId: x.provider_id, total: x.total, items }];
  });
  return { orderGroupId: groupId, bookings, payment: { amount: pay.amount, status: typeof pay.status === "string" ? pay.status : "pending" } };
}
