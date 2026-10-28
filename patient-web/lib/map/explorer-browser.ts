"use client";

/** The browser-only part of the providers map: the permission, the position (asked only when granted) and the saved address point. */
import { parseDeliveryAddresses, pickDeliveryAddress } from "@/lib/pharmacy/delivery-address";
import type { MapPoint } from "@/lib/map/explorer-model";

export async function geolocationPermission(): Promise<"granted" | "prompt" | "denied"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    // no Permissions API: do not ask on load; the "Near me" button asks
    return "prompt";
  }
}

export function currentPosition(timeoutMs = 8000): Promise<MapPoint | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

/** The point of the default saved address (else the first with a point), read through the patient proxy; null for a guest. */
export async function savedAddressPoint(doFetch: typeof fetch = fetch): Promise<MapPoint | null> {
  const response = await doFetch("/api/patient/users/me/addresses", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) return null;
  const picked = pickDeliveryAddress(parseDeliveryAddresses(await response.json().catch(() => null)));
  return picked ? { lat: picked.lat, lng: picked.lng } : null;
}
