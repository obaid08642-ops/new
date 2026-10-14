"use client";

/**
 * The browser-only part of the doctors filters (Nearest: the device location, else the city of the patient's saved address).
 * Kept out of lib/consult/doctor-filters.ts on purpose: that file is imported by the server reads of the static/ISR public
 * pages (lib/api/doctors-server.ts), and a request-data read (a no-store fetch) in their import closure is refused by
 * tests/static-public-pages.test.ts (F82-3).
 */
import { parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";
import type { NearbyPlace } from "@/lib/consult/doctor-filters";

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export type PlaceDeps = {
  /** The browser position, or null when it is denied, timed out or not supported. */
  deviceCoords: () => Promise<{ lat: number; lng: number } | null>;
  /** The city of the saved address, if the patient is signed in and has one. */
  savedCity: () => Promise<string | undefined>;
};

/** Where "Nearest" measures from: the device position, else the saved address city, else null. Nothing is invented. */
export async function resolveNearbyPlace(deps: PlaceDeps): Promise<NearbyPlace | null> {
  try {
    const here = await deps.deviceCoords();
    if (here && finite(here.lat) && finite(here.lng) && Math.abs(here.lat) <= 90 && Math.abs(here.lng) <= 180) return { kind: "coords", lat: here.lat, lng: here.lng };
  } catch {
    // denied or unavailable: fall through to the city
  }
  try {
    const city = (await deps.savedCity())?.trim();
    if (city) return { kind: "city", city: city.slice(0, 80) };
  } catch {
    // no saved address readable: no place
  }
  return null;
}

/** The browser position, asked at call time (never on load). */
export function browserCoords(timeoutMs = 8000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** The city of the default saved address (else the first one with a city), read through the patient proxy. */
export async function savedAddressCity(doFetch: typeof fetch = fetch): Promise<string | undefined> {
  const response = await doFetch("/api/patient/users/me/addresses", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return undefined;
  const list = parseDeliveryAddresses(await response.json().catch(() => null));
  return (list.find((a) => a.isDefault && a.city) ?? list.find((a) => a.city))?.city ?? undefined;
}
