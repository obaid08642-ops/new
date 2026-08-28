import { Redirect } from 'expo-router';

/** Exercise planning is not persisted by the current nutrition API; keep deep links honest. */
export default function ExercisePlanRedirect() {
  return <Redirect href="/nutrition/daily-tracker" />;
}
