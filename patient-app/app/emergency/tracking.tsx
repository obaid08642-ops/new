import { Redirect } from 'expo-router';

/** Removed by owner decision 14 (2026-10-10): no in-app SOS, ambulance or tracking. The old route opens the urgent-help screen. */
export default function RemovedEmergencyRoute() {
  return <Redirect href="/emergency" />;
}
