// expo-notifications writes com.google.firebase.messaging.default_notification_channel_id and ..._color into the app manifest, and
// @react-native-firebase/messaging declares the same two <meta-data> entries (empty channel id, @color/white) in its library manifest.
// The Android manifest merger then fails ("Manifest merger failed", processReleaseMainManifest). The app's values must win, so both
// elements get tools:replace for the attribute that differs (the fix documented by react-native-firebase). Idempotent.
const { withAndroidManifest } = require('expo/config-plugins');

const REPLACE = {
  'com.google.firebase.messaging.default_notification_channel_id': 'android:value',
  'com.google.firebase.messaging.default_notification_color': 'android:resource',
};

function mergeReplace(existing, attribute) {
  const list = (existing || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.includes(attribute)) list.push(attribute);
  return list.join(',');
}

function applyToManifest(manifest) {
  manifest.$ = manifest.$ || {};
  manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
  const app = manifest.application && manifest.application[0];
  if (!app || !app['meta-data']) return manifest;
  for (const md of app['meta-data']) {
    const attribute = md.$ && REPLACE[md.$['android:name']];
    if (attribute) md.$['tools:replace'] = mergeReplace(md.$['tools:replace'], attribute);
  }
  return manifest;
}

module.exports = function withFirebaseMessagingManifestMerge(config) {
  return withAndroidManifest(config, (cfg) => {
    applyToManifest(cfg.modResults.manifest);
    return cfg;
  });
};
module.exports.applyToManifest = applyToManifest;
