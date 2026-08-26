import { Redirect } from 'expo-router';

/** Legacy route retained without claiming an unpersisted AI nutrition plan. */
export default function NutritionPlanBuilderRedirect() {
  return <Redirect href="/nutrition/hub" />;
}
