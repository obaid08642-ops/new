import { Platform } from 'react-native';
import { apiFetch } from '../utils/api';
import { canRingNatively, ringNativeCall } from '../utils/callkeep';
import { handleRingPayload, type RingData } from './ringTask';

/**
 * iOS: PushKit VoIP token → backend (`provider: apns_voip`), and the VoIP push → CallKit. Apple requires a CallKit
 * call for every VoIP push, so the ring is shown before anything else runs.
 *
 * Needs, outside this repo: the `react-native-voip-push-notification` native module in the iOS build, and the APNs auth key
 * (APNS_KEY_ID / APNS_TEAM_ID / APNS_AUTH_KEY) on the backend, which then sends to `<bundle id>.voip`. Without the module
 * this is a no-op and calls still ring through the normal push.
 */
interface VoipModule {
  addEventListener(event: 'register', cb: (token: string) => void): void;
  addEventListener(event: 'notification', cb: (n: { data?: RingData; _data?: RingData }) => void): void;
  registerVoipToken(): void;
  onVoipNotificationCompleted?(uuid: string): void;
}

let started = false;

function loadVoip(): VoipModule | null {
  try {
    return require('react-native-voip-push-notification').default as VoipModule; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}

export async function registerVoipPush(): Promise<boolean> {
  if (Platform.OS !== 'ios' || started || !canRingNatively()) return false;
  const voip = loadVoip();
  if (!voip) return false;
  started = true;
  voip.addEventListener('register', (token) => {
    void apiFetch('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, provider: 'apns_voip', platform: 'ios', device_name: 'iOS VoIP', call_ring: true }),
    }).catch(() => { /* retried at the next app start */ });
  });
  voip.addEventListener('notification', (n) => {
    const data = n.data ?? n._data;
    if (data?.session_id && (data.type === 'call' || data.type === 'incoming_call')) {
      void ringNativeCall(data.session_id, data.caller_name || data.title || '', (data.call_type ?? 'video') !== 'voice');
    } else {
      void handleRingPayload(data);
    }
  });
  voip.registerVoipToken();
  return true;
}
