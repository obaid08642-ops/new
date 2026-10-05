// D2: web-to-app path mapping for deep links.
//
// When a user taps a web link (https://nabd.plus/ar/p/xxx) and the app is
// installed, iOS/Android route it here instead of opening the browser. This
// file strips the locale prefix, maps the web path to an EXISTING app route,
// and opens the browser when there is no matching app screen.

import { Linking } from 'react-native';
import { Redirect } from 'expo-router';
import { resolveIncomingLink } from '../src/navigation/deepLinkMapper';

/**
 * Expo Router calls this for every incoming universal link and expects a path
 * string back (not an object). Stay in the app for screens it has; otherwise
 * open the web page in the browser and land on home.
 */
export async function redirectSystemPath({ path }: { path: string; initial: boolean }): Promise<string> {
  const target = resolveIncomingLink(path);
  if ('app' in target) return target.app;
  await Linking.openURL(target.browser);
  return '/';
}

export default function NativeIntent() {
  return <Redirect href="/" />;
}
