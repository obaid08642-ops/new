import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated the location view of booking-status (batch 14) — deep-link-safe redirect with params passthrough. */
export default function RedirectToClinicLocation() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .filter(([key]) => key !== "view" && key !== "state")
    .map(([key, v]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return <Redirect href={`/consultations/booking-status?view=location${q ? `&${q}` : ""}`} />;
}
