import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated merged into pharmacy/request (Phase 2.3) — deep-link-safe redirect. */
export default function RedirectToPharmacyRequest() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return <Redirect href={`/pharmacy/request${q ? `?${q}` : ""}`} />;
}
