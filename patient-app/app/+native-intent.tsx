// D2: web-to-app path mapping for deep links.
//
// When a user taps a web link (https://nabd.plus/ar/p/xxx) and the app is
// installed, iOS/Android route it here instead of opening the browser. This
// file strips the locale prefix, maps the web path to the app route, and
// opens the browser only when there is no matching app screen.

import { Linking } from 'react-native';
import { Redirect } from 'expo-router';

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];

/** Strip the locale prefix from a web path. */
function stripLocale(path: string): string {
  const parts = path.replace(/^\//, '').split('/');
  if (parts.length > 1 && LOCALES.includes(parts[0])) return '/' + parts.slice(1).join('/');
  return path;
}

/** Map a web path to an app route. Returns null if no app screen exists. */
function mapPath(path: string): string | null {
  const clean = stripLocale(path);
  const parts = clean.replace(/^\//, '').split('/').filter(Boolean);

  // Medicine detail: /p/:slug or /medicine/:slug
  if (parts[0] === 'p' || parts[0] === 'medicine') return `/p/${parts[1] || ''}`;
  // Doctor profile: /doctor/:slug[/:city]
  if (parts[0] === 'doctor') return `/doctor/${parts[1] || ''}`;
  // Condition: /condition/:slug
  if (parts[0] === 'condition') return `/condition/${parts[1] || ''}`;
  // Facility: /facility/:slug
  if (parts[0] === 'facility') return `/facility/${parts[1] || ''}`;
  // Doctors search: /doctors
  if (parts[0] === 'doctors') return `/doctors`;
  // Home nursing: /home-nursing
  if (parts[0] === 'home-nursing') return `/home-nursing`;
  // SEO link catcher: /s/:type/:slug
  if (parts[0] === 's') return `/s/${parts[1] || ''}/${parts[2] || ''}`;
  // Pharmacy: /pharmacy/:slug
  if (parts[0] === 'pharmacy') return `/pharmacy/${parts[1] || ''}`;
  // Pharmacies by city: /pharmacies/:city
  if (parts[0] === 'pharmacies') return `/pharmacies/${parts[1] || ''}`;
  // Consultations: /consultations
  if (parts[0] === 'consultations') return `/consultations`;
  // Labs: /labs
  if (parts[0] === 'labs') return `/labs`;
  // Radiology: /radiology
  if (parts[0] === 'radiology') return `/radiology`;
  // Nursing: /nursing
  if (parts[0] === 'nursing') return `/nursing`;
  // Category: /c/:slug
  if (parts[0] === 'c') return `/c/${parts[1] || ''}`;
  // Articles: /articles
  if (parts[0] === 'articles') return `/articles`;
  // Services: /services
  if (parts[0] === 'services') return `/services`;
  // Orders: /orders/:id
  if (parts[0] === 'orders') return `/orders/${parts[1] || ''}`;
  // Chat: /chat/:id
  if (parts[0] === 'chat') return `/chat/${parts[1] || ''}`;
  // Family join: the Join tab of /family/add
  if (parts[0] === 'family' && parts[1] === 'join') return `/family/add?tab=join`;
  // Diagnostics: /diagnostics
  if (parts[0] === 'diagnostics') return `/diagnostics`;
  // Community: /community
  if (parts[0] === 'community') return `/community`;

  return null;
}

export default function NativeIntent() {
  // This component is rendered when the app is opened via a deep link.
  // The actual routing is handled by the linking config in app.json.
  // This file exists to handle the redirectSystemPath logic that
  // expo-router uses for web-to-app links.
  return <Redirect href="/" />;
}

// Export the path mapper for use in the linking config.
export { mapPath, stripLocale };
