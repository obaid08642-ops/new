import { Redirect } from 'expo-router';

/** A bookable diagnostic checkout requires provider-verified availability and a verified payment workflow. */
export default function DiagnosticsCheckoutRedirect() {
  return <Redirect href="/(tabs)/diagnostics" />;
}
