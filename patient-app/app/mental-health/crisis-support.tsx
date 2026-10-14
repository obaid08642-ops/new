import { Redirect } from 'expo-router';

/** Removed feature (owner decision 8, 2026-10-06): no in-app crisis handling. The old route opens the mental-health hub. */
export default function CrisisSupportRedirect() {
  return <Redirect href="/mental-health/hub" />;
}
