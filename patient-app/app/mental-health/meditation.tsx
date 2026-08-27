import { Redirect } from 'expo-router';

/** Guided meditation content is deferred until it is clinically reviewed, fully localized, and backed by truthful session content. */
export default function MeditationRedirect() {
  return <Redirect href="/mental-health/hub" />;
}
