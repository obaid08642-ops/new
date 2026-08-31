import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated merged into booking-status (Phase 2.2) — kept as a deep-link-safe redirect. */
export default function RedirectToBookingStatus() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return <Redirect href={`/consultations/booking-status${q ? `?${q}` : ""}`} />;
}
