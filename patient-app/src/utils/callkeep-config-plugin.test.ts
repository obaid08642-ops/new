// Q62/Q65: react-native-callkeep runs self-managed (MANAGE_OWN_CALLS) but the
// app declared no ConnectionService, so Android had nothing to bind for an
// incoming call. A local config plugin declares callkeep's services, and the
// app config uses it. SCHEDULE_EXACT_ALARM stays: medication reminders are
// scheduled locally (expo-notifications).
import fs from 'node:fs';
import path from 'node:path';

const plugin = require('../../plugins/with-callkeep-services');

describe('callkeep Android services', () => {
  it('declares the telecom ConnectionService and the background messaging service once', () => {
    const manifest: any = { manifest: { application: [{ $: { 'android:name': '.MainApplication' } }] } };
    plugin.addCallKeepServices(manifest);
    plugin.addCallKeepServices(manifest); // idempotent on prebuild re-runs
    const services = manifest.manifest.application[0].service;
    const voice = services.filter((s: any) => s.$['android:name'] === 'io.wazo.callkeep.VoiceConnectionService');
    expect(voice).toHaveLength(1);
    expect(voice[0].$['android:permission']).toBe('android.permission.BIND_TELECOM_CONNECTION_SERVICE');
    expect(voice[0].$['android:exported']).toBe('true');
    expect(voice[0]['intent-filter'][0].action[0].$['android:name']).toBe('android.telecom.ConnectionService');
    expect(services.filter((s: any) => s.$['android:name'] === 'io.wazo.callkeep.RNCallKeepBackgroundMessagingService')).toHaveLength(1);
  });

  it('is registered in app.json; exact alarms are kept only because reminders are scheduled locally', () => {
    const app = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../app.json'), 'utf8')).expo;
    expect(app.plugins).toContain('./plugins/with-callkeep-services');
    const reminders = fs.readFileSync(path.resolve(__dirname, 'medication-notifications.ts'), 'utf8');
    expect(reminders).toContain('scheduleNotificationAsync');
    expect(app.android.permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });
});
