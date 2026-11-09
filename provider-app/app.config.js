// Over-the-air updates (docs/ops/OTA_UPDATES.md). app.json holds the static config; the EAS project id is the only
// per-owner value, so it comes from the environment (EAS_PROJECT_ID) or extra.eas.projectId and is never committed.
// Without it updates are switched off, so a build that has no Expo project (CI, local) is unaffected.
const fs = require('fs');
const path = require('path');

// FCM / APNs credentials are per-owner files that are never committed: the build supplies them by path (EAS file secrets, or a
// file next to this one). Without them the build still works, it just cannot receive remote push, so a missing file is
// reported by the push matrix (docs/qa/push-calls-provider.md) instead of breaking prebuild.
function withPushCredentials(config) {
  const android = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  const ios = process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist';
  const has = (f) => fs.existsSync(path.resolve(__dirname, f));
  return {
    ...config,
    android: { ...config.android, ...(has(android) ? { googleServicesFile: android } : {}) },
    ios: { ...config.ios, ...(has(ios) ? { googleServicesFile: ios } : {}) },
  };
}

module.exports = ({ config: base }) => {
  const config = withPushCredentials(base);
  const projectId = process.env.EAS_PROJECT_ID || (config.extra && config.extra.eas && config.extra.eas.projectId);
  if (!projectId) return { ...config, updates: { ...config.updates, enabled: false } };
  return {
    ...config,
    updates: { ...config.updates, url: `https://u.expo.dev/${projectId}` },
    extra: { ...config.extra, eas: { ...(config.extra && config.extra.eas), projectId } },
  };
};
