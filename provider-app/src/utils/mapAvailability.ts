import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Can the native map be mounted? iOS draws Apple Maps and needs no key. On Android react-native-maps crashes the whole app at
 * mount ("API key not found") when the build has no Google Maps key, so without one no native MapView is ever created: the
 * screens show the position as text with "use my location" instead. The key is a build secret (GOOGLE_MAPS_ANDROID_API_KEY,
 * read by app.config.ts), never in the repo. Same rule as patient-app/src/utils/mapAvailability.ts.
 */
export function mapIsAvailable(os: string, androidKey: unknown): boolean {
  if (os !== 'android') return true;
  return typeof androidKey === 'string' && androidKey.trim().length > 0;
}

const configured = (Constants.expoConfig as { android?: { config?: { googleMaps?: { apiKey?: unknown } } } } | null)?.android?.config?.googleMaps?.apiKey;

/** Fixed for the life of the build. */
export const mapAvailable: boolean = mapIsAvailable(Platform.OS, configured);
