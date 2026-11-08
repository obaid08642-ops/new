// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/with-firebase-messaging-manifest-merge');

const manifest = () => ({
  $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' } as Record<string, string>,
  application: [{
    'meta-data': [
      { $: { 'android:name': 'com.google.firebase.messaging.default_notification_channel_id', 'android:value': 'default' } as Record<string, string> },
      { $: { 'android:name': 'com.google.firebase.messaging.default_notification_color', 'android:resource': '@color/notification_icon_color' } as Record<string, string> },
      { $: { 'android:name': 'other.key', 'android:value': 'x' } as Record<string, string> },
    ],
  }],
});

describe('with-firebase-messaging-manifest-merge', () => {
  it('adds tools:replace to the two firebase meta-data entries and declares the tools namespace', () => {
    const m = plugin.applyToManifest(manifest());
    const md = m.application[0]['meta-data'];
    expect(m.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(md[0].$['tools:replace']).toBe('android:value');
    expect(md[1].$['tools:replace']).toBe('android:resource');
    expect(md[2].$['tools:replace']).toBeUndefined();
  });

  it('is idempotent', () => {
    const m = plugin.applyToManifest(plugin.applyToManifest(manifest()));
    expect(m.application[0]['meta-data'][0].$['tools:replace']).toBe('android:value');
  });
});
