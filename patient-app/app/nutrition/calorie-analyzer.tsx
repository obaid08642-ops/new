import { Redirect } from 'expo-router';

/** Food analysis estimates are not persisted or verified by the current API. */
export default function CalorieAnalyzerRedirect() {
  return <Redirect href="/nutrition/log-meal" />;
}
