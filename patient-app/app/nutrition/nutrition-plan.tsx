import { Redirect } from 'expo-router';

/**
 * Legacy entry point retained for deep links. Weekly plans are not persisted by the
 * current API, so it routes to the truthful nutrition hub instead of implying an AI plan exists.
 */
export default function NutritionPlanRedirect() {
  return <Redirect href="/nutrition/hub" />;
}
