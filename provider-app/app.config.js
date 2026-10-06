/**
 * Q69: the Android Google Maps key must come from an EAS secret / env, never
 * from the repo (a missing key crashes every map screen at launch). Expo
 * reads this dynamic config instead of the static app.json and merges the
 * same content, plus the key from the environment.
 */
const base = require('./app.json').expo;

const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  ...base,
  android: {
    ...(base.android || {}),
    config: {
      ...((base.android || {}).config || {}),
      googleMaps: { apiKey: mapsKey },
    },
  },
};
