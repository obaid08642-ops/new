import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated merged into booking-status (batch 14, merge map 2 section 1): the confirmed state of the same booking. Keeps the query. */
export default function RedirectToBookingStatus() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .filter(([key]) => key !== "state")
    .map(([key, v]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return <Redirect href={`/consultations/booking-status?state=confirmed${q ? `&${q}` : ""}`} />;
}
