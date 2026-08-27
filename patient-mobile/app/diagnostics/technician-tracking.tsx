import { Redirect } from 'expo-router';

/** Live collector location, ETA, and contact actions require a verified tracking contract. */
export default function TechnicianTrackingRedirect() {
  return <Redirect href="/diagnostics/orders" />;
}
