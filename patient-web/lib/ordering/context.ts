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
  const usable = rows.filter((r): r is Raw => !!r && typeof r === "object" && typeof r.latitude === "number" && typeof r.longitude === "number" && Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  const chosen = usable.find((r) => r.is_default === true) ?? usable[0];
  return chosen ? { lat: chosen.latitude as number, lng: chosen.longitude as number } : null;
}

/** The query string that carries the context from page to page. */
export function contextQuery(c: { kind?: string; place: OrderMode; pay: Payer }): string {
  const p = new URLSearchParams();
  if (c.kind && c.kind !== "lab") p.set("kind", c.kind);
  if (c.place !== "home") p.set("place", c.place);
  if (c.pay !== "cash") p.set("pay", "insurance");
  const s = p.toString();
  return s ? `?${s}` : "";
}
