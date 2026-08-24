import { Redirect } from 'expo-router';

/** Live collector ETA and preparation instructions are unavailable without a verified tracking payload. */
export default function SampleTrackingRedirect() {
  return <Redirect href="/diagnostics/orders" />;
}
