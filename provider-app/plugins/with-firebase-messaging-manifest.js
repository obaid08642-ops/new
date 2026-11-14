// @react-native-firebase/messaging declares com.google.firebase.messaging.default_notification_channel_id and
// ..._default_notification_color in its own manifest, and expo-notifications writes the same two entries into the app manifest, so the
// release manifest merge fails ("Attribute meta-data#... is also present at [:react-native-firebase_messaging]"). The app's values
// (the "default" channel and the brand colour from the expo-notifications plugin options) are the ones to keep: mark both entries
// tools:replace so they win over the library's empty ones.
// Order matters: Expo runs manifest mods last-registered first, so this plugin is listed BEFORE expo-notifications in app.json; it then
// runs after expo-notifications has written its entries.
const { withAndroidManifest } = require('expo/config-plugins');

const REPLACE = {
  'com.google.firebase.messaging.default_notification_channel_id': 'android:value',
  'com.google.firebase.messaging.default_notification_color': 'android:resource',
};

module.exports = function withFirebaseMessagingManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };
    for (const app of manifest.application || []) {
      for (const meta of app['meta-data'] || []) {
        const attr = REPLACE[meta.$['android:name']];
        if (attr) meta.$['tools:replace'] = attr;
      }
    }
    return cfg;
  });
};
