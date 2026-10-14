import { Redirect, type Href } from 'expo-router';

/** Automated clinical report interpretation is unavailable until a clinically governed review workflow exists. */
export default function ReportAiAnalysisRedirect() {
  return <Redirect href={'/health/records?tab=reports' as Href} />;
}
