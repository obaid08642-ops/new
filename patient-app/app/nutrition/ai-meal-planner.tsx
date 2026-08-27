import { Redirect } from 'expo-router';

/**
 * Legacy deep link. The current nutrition API does not persist or validate weekly meal plans,
 * so this route intentionally opens the real daily tracker instead of presenting a fabricated plan.
 */
export default function MealPlannerRedirect() {
  return <Redirect href="/nutrition/daily-tracker" />;
}
