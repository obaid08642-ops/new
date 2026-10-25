import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json stays the static config. The only thing added here is the Google Maps key for Android, read from the build
 * environment (GOOGLE_MAPS_ANDROID_API_KEY: an EAS / GitHub secret the owner sets, never in the repo). Without it nothing is
 * written, and the app does not mount a native map on Android (src/utils/mapAvailability.ts), so a build without the key
 * degrades to lists instead of crashing with "API key not found". iOS keeps Apple Maps.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const key = (process.env.GOOGLE_MAPS_ANDROID_API_KEY || '').trim();
  if (!key) return config as ExpoConfig;
  return {
    ...config,
    android: { ...config.android, config: { ...config.android?.config, googleMaps: { apiKey: key } } },
  } as ExpoConfig;
};
