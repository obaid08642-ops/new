import { Redirect } from 'expo-router';

/** The legacy timeline expected diagnostic urgency and reasoning fields that the guided-triage contract no longer exposes. */
export default function SymptomTimelineRedirect() {
  return <Redirect href="/ai/triage" />;
}
