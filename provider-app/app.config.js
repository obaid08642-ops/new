/**
 * Q69: the Android Google Maps key must come from an EAS secret / env, never
 * from the repo (a missing key crashes every map screen at launch). Expo
 * reads this dynamic config instead of the static app.json and merges the
 * same content, plus the key from the environment.
 *
 * P15.5: also wires `@sentry/react-native/expo` so the JS bundle source maps are
 * uploaded with each build. That is what makes a Sentry stack trace readable instead
 * of a wall of transpiled frames.
 *
 * Both integrations are inert without their environment variables, so a developer
 * build with no secrets still configures and runs:
 *   GOOGLE_MAPS_API_KEY / EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
 *   SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN (EAS/CI secret, never committed)
 *   EXPO_PUBLIC_SENTRY_DSN (inlined into the bundle)
 *
 * BLOCKED: SENTRY_AUTH_TOKEN and EXPO_PUBLIC_SENTRY_DSN are owner secrets; the upload
 * and the live event send cannot be exercised in this worktree.
 */
const base = require('./app.json').expo;

const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Only register the Sentry plugin when the upload coordinates are present: the plugin
// warns (and can fail the build) without an org/project.
const sentryOrg = process.env.SENTRY_ORG || '';
const sentryProject = process.env.SENTRY_PROJECT || '';
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || '';

const plugins = [...(base.plugins || [])];
if (sentryOrg && sentryProject) {
  plugins.push([
    '@sentry/react-native/expo',
    {
      // Must match the `release` stamped in src/utils/sentry.ts: `app@version+build`.
      url: 'https://sentry.io/',
      organization: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,
      setAutomaticSymbolication: true,
      setSentryReactNativeVersion: true,
    },
  ]);
}

module.exports = {
  ...base,
  android: {
    ...(base.android || {}),
    config: {
      ...((base.android || {}).config || {}),
      googleMaps: { apiKey: mapsKey },
    },
  },
  plugins,
  extra: {
    ...(base.extra || {}),
    // Read by src/utils/sentry.ts at runtime; not a secret.
    sentryReleaseName: `${base.name}@${base.version}`,
  },
};