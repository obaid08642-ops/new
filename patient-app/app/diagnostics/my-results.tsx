import { Redirect, type Href } from 'expo-router';

/** Folded into "My orders and results" (owner decision 5): the third tab lists the lab results and radiology reports. Deep-link and notification safe. */
export default function DiagnosticsMyResultsRedirect() {
  return <Redirect href={{ pathname: '/orders', params: { tab: 'results' } } as unknown as Href} />;
}
