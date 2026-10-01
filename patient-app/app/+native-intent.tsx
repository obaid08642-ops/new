// D2: web-to-app path mapping for deep links.
//
// When a user taps a web link (https://nabd.plus/ar/p/xxx) and the app is
// installed, iOS/Android route it here instead of opening the browser. This
// file strips the locale prefix, maps the web path to an EXISTING app route,
// and opens the browser when there is no matching app screen.

import { Linking } from 'react-native';
import { Redirect } from 'expo-router';
import { mapPath } from '../src/navigation/deepLinkMapper';

/**
 * Expo Router calls this for every incoming universal link. Return a path to
 * stay in the app, or open the browser for web-only routes.
 */
export async function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  const mapped = mapPath(path);
  if (mapped) return { path: mapped };
  // No app screen — open the full URL in the browser.
  const url = `https://nabd.plus${path.startsWith('/') ? path : '/' + path}`;
  await Linking.openURL(url);
  return { path: '/' };
}

export default function NativeIntent() {
  return <Redirect href="/" />;
}
