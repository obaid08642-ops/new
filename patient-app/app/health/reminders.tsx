import { Redirect } from 'expo-router';

/** This legacy route now uses the canonical medication timeline with local alerts and duplicate-safe dose actions. */
export default function RemindersRedirect() {
  return <Redirect href="/health/medication-reminder-list" />;
}
