import { Redirect } from 'expo-router';

/** The legacy symptom checker inferred conditions and treatment-oriented tips; use the structured guided triage flow instead. */
export default function SymptomCheckerRedirect() {
  return <Redirect href="/ai/triage" />;
}
