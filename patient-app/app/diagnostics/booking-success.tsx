import { Redirect } from "expo-router";

/** Merged (J3 journey compression) — success state lives in booking-status/orders.
 *  Deep-link-safe: lands on orders where the new booking appears. */
export default function DiagnosticsBookingSuccessRedirect() {
  return <Redirect href="/diagnostics/orders" />;
}
