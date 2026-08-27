import { Redirect } from 'expo-router';

/** Water logs and their target are displayed from the verified daily summary. */
export default function WaterTrackerRedirect() {
  return <Redirect href="/nutrition/daily-tracker" />;
}
