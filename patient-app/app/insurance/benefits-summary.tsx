import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated unified screen (Phase 2) — deep-link-safe redirect with params passthrough. */
export default function UnifiedRedirect() {
  const params = useLocalSearchParams();
  const q = Object.entries(params as Record<string, unknown>)
    .filter(([k]) => k !== "view")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const sep = "/insurance/coverage-check?view=benefits".includes("?") ? "&" : "?";
  return <Redirect href={`/insurance/coverage-check?view=benefits${q ? `${sep}${q}` : ""}`} />;
}
