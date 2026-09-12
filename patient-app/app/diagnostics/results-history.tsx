import { Redirect } from "expo-router";

/** Merged (J3 journey compression) — my-results is the superset
 *  (labs/bookings/mine + radiology/reports/mine). Deep-link-safe redirect. */
export default function DiagnosticsResultsHistoryRedirect() {
  return <Redirect href="/diagnostics/my-results" />;
}
