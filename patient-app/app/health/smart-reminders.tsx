import { Redirect } from 'expo-router';

/** Canonical medication reminders include local-device alert synchronisation and duplicate-safe dose logging. */
export default function SmartRemindersRedirect() {
  return <Redirect href="/health/medication-reminder-list" />;
}
