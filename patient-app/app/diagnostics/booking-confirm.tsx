import { Redirect } from 'expo-router';

/** Booking confirmation needs provider availability, an authenticated address, and verified payment or insurance data. */
export default function DiagnosticsBookingConfirmRedirect() {
  return <Redirect href="/(tabs)/diagnostics" />;
}
