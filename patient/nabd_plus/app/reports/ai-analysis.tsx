import { Redirect } from 'expo-router';

/** Automated clinical report interpretation is unavailable until a clinically governed review workflow exists. */
export default function ReportAiAnalysisRedirect() {
  return <Redirect href="/health/reports" />;
}
