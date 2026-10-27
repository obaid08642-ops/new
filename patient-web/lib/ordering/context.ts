/**
 * The ordering context of a service screen: where (home / facility), who pays (cash / insurance) and the point the quote is made for.
 * Place and payment stay in the URL as on the hub (`place`, `pay`); the point is the default saved address's coordinates
 * (GET /users/me/addresses: latitude, longitude). Without a point the quote cannot be made and the screen asks for an address.
 */
import type { OrderMode, Payer } from "./quote";

export type Point = { lat: number; lng: number };
type Raw = Record<string, unknown>;

export const placeOf = (v: unknown): OrderMode => (v === "facility" ? "facility" : "home");
export const payOf = (v: unknown): Payer => (v === "insurance" ? "insurance" : "cash");

/** The default address's coordinates (is_default, else the first saved one that has them), or null. */
export function pointFromAddresses(payload: unknown): Point | null {
  const rows: Raw[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as Raw).addresses ?? (payload as Raw).data)
      ? (((payload as Raw).addresses ?? (payload as Raw).data) as Raw[])
      : [];
  // The backend's address rows carry `lat` / `lng` (users.addresses.dto.ts); `latitude` / `longitude` are accepted too.
  const coords = (r: Raw): Point | null => {
    const lat = typeof r.lat === "number" ? r.lat : r.latitude;
    const lng = typeof r.lng === "number" ? r.lng : r.longitude;
    return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };
  const usable = rows.filter((r): r is Raw => !!r && typeof r === "object" && coords(r) !== null);
  const chosen = usable.find((r) => r.is_default === true) ?? usable[0];
  return chosen ? coords(chosen) : null;
}

/** The query string that carries the context from page to page. */
export function contextQuery(c: { kind?: string; place: OrderMode; pay: Payer; item?: string }): string {
  const p = new URLSearchParams();
  if (c.kind && c.kind !== "lab") p.set("kind", c.kind);
  if (c.place !== "home") p.set("place", c.place);
  if (c.pay !== "cash") p.set("pay", "insurance");
  if (c.item) p.set("item", c.item); // a one-item order (Order now): the steps work on this item, not on the basket
  const s = p.toString();
  return s ? `?${s}` : "";
}
