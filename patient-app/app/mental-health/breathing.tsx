import { Redirect } from 'expo-router';

/** Breathing content is deferred until it is clinically reviewed and fully localized for all supported languages. */
export default function BreathingRedirect() {
  return <Redirect href="/mental-health/hub" />;
}
