/**
 * The patient's saved delivery address for a pharmacy broadcast (GET /users/me/addresses through the patient proxy).
 * A broadcast needs a real location (lat/lng): the pharmacies are chosen by distance (3 -> 5 -> 8 km), so an address
 * without coordinates cannot be used and is never filled in or guessed here.
 */
export type DeliveryAddress = {
  id: string;
  label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The API answers a bare list, or `{ addresses }` / `{ data }`. */
export function parseDeliveryAddresses(payload: unknown): DeliveryAddress[] {
  const root = record(payload);
  const list = Array.isArray(payload) ? payload : [root?.addresses, root?.data].find(Array.isArray);
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    const row = record(entry);
    const id = text(row?.id);
    if (!row || !id) return [];
    return [{
      id,
      label: text(row.label),
      street: text(row.street) ?? text(row.line1),
      city: text(row.city),
      district: text(row.district),
      lat: finite(row.lat),
      lng: finite(row.lng),
      isDefault: row.is_default === true,
    }];
  });
}

export function hasLocation(address: DeliveryAddress): address is DeliveryAddress & { lat: number; lng: number } {
  return address.lat !== null && address.lng !== null;
}

/** The default address when it has a location, else the first one that has. */
export function pickDeliveryAddress(addresses: DeliveryAddress[]): (DeliveryAddress & { lat: number; lng: number }) | null {
  const located = addresses.filter(hasLocation);
  return located.find((address) => address.isDefault) ?? located[0] ?? null;
}

/** "street, district, city" in the locale's own list style; the parts the API did not send are left out. */
export function formatAddressLine(address: DeliveryAddress, locale: string): string {
  const parts = [address.street, address.district, address.city].filter((part): part is string => Boolean(part));
  if (!parts.length) return "";
  return new Intl.ListFormat(locale, { type: "unit", style: "short" }).format(parts);
}

/** The shape DeliveryAddressDto (backend pharmacy.controllers.dto.ts) accepts, within its length limits. */
export function toBroadcastAddress(address: DeliveryAddress & { lat: number; lng: number }) {
  return {
    ...(address.label ? { label: address.label.slice(0, 80) } : {}),
    ...(address.street ? { street: address.street.slice(0, 300) } : {}),
    ...(address.city ? { city: address.city.slice(0, 80) } : {}),
    ...(address.district ? { district: address.district.slice(0, 80) } : {}),
    lat: address.lat,
    lng: address.lng,
  };
}
