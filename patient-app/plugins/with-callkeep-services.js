// Q62/Q65: react-native-callkeep is set up self-managed (src/utils/callkeep.ts)
// and needs its ConnectionService declared in the Android manifest; without it
// Android has nothing to bind for an incoming call. Idempotent for prebuild.
const { withAndroidManifest } = require('@expo/config-plugins');

const VOICE = 'io.wazo.callkeep.VoiceConnectionService';
const MESSAGING = 'io.wazo.callkeep.RNCallKeepBackgroundMessagingService';

function addCallKeepServices(androidManifest) {
  const app = androidManifest.manifest.application[0];
  app.service = app.service || [];
  const has = (name) => app.service.some((s) => s.$ && s.$['android:name'] === name);
  if (!has(VOICE)) {
    app.service.push({
      $: {
        'android:name': VOICE,
        'android:label': 'Nabd',
        'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{ action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }] }],
    });
  }
  if (!has(MESSAGING)) app.service.push({ $: { 'android:name': MESSAGING } });
  return androidManifest;
}

const withCallKeepServices = (config) =>
  withAndroidManifest(config, (cfg) => {
    addCallKeepServices(cfg.modResults);
    return cfg;
  });

module.exports = withCallKeepServices;
module.exports.addCallKeepServices = addCallKeepServices;
