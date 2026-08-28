import { Redirect } from 'expo-router';

/** Advanced composition metrics are not available in the persisted nutrition profile. */
export default function BodyCompositionRedirect() {
  return <Redirect href="/nutrition/body-target" />;
}
