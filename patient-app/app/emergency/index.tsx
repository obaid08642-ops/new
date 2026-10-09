import { Redirect } from "expo-router";

// Owner decision 8 (D-8): no in-app crisis handling; the emergency entry is the SOS screen.
export default function EmergencyIndex() {
  return <Redirect href="/emergency/sos" />;
}
