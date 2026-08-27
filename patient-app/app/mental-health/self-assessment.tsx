import { Redirect } from 'expo-router';

/** Diagnostic-style self-assessments are intentionally unavailable until a clinically governed workflow is approved. */
export default function SelfAssessmentRedirect() {
  return <Redirect href="/mental-health/hub" />;
}
