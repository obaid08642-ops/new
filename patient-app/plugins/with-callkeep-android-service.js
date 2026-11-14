// react-native-callkeep's library manifest only declares permissions: the ConnectionService that the system telecom stack binds to for an
// incoming call (and the headless task service) must be declared by the app. Without it Android cannot ring a killed or locked phone through
// the system call screen. Same declaration as the library's Android setup; idempotent. Checked on the built APK by
// tools/native/calls_static_check.py (docs/qa/push-calls-matrix.md).
const { withAndroidManifest } = require('expo/config-plugins');

const CONNECTION = 'io.wazo.callkeep.VoiceConnectionService';
const BACKGROUND = 'io.wazo.callkeep.RNCallKeepBackgroundMessagingService';

module.exports = function withCallkeepAndroidService(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application && cfg.modResults.manifest.application[0];
    if (!app) return cfg;
    app.service = app.service || [];
    const has = (name) => app.service.some((s) => s.$ && s.$['android:name'] === name);
    if (!has(CONNECTION)) {
      app.service.push({
        $: {
          'android:name': CONNECTION,
          'android:label': 'Call',
          'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
          'android:foregroundServiceType': 'camera|microphone',
          'android:exported': 'true',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.telecom.ConnectionService' } }] }],
      });
    }
    if (!has(BACKGROUND)) app.service.push({ $: { 'android:name': BACKGROUND } });
    return cfg;
  });
};
