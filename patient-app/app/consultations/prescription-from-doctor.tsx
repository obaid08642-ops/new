import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated merged into appointment-detail (batch 14, merge map 2 section 1) — deep-link-safe redirect, the query is kept. */
export default function RedirectToAppointmentDetail() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .map(([key, v]) => `${encodeURIComponent(key === "id" ? "appointmentId" : key)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return <Redirect href={params.appointmentId || params.id ? `/consultations/appointment-detail?${q}` : "/consultations/appointments"} />;
}
