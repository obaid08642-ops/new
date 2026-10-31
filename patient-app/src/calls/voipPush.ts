import { Platform } from 'react-native';
import { apiFetch } from '../utils/api';
import { canRingNatively } from '../utils/callkeep';
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
let pendingToken: string | null = null;
let authReady = false;
let tokenSent: string | null = null;

function loadVoip(): VoipModule | null {
  try {
    return require('react-native-voip-push-notification').default as VoipModule; // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    return null;
  }
}

/** Sends the PushKit token once the user is signed in (the endpoint needs the session); safe to call any number of times. */
export async function flushVoipToken(): Promise<void> {
  if (!authReady || !pendingToken || tokenSent === pendingToken) return;
  const token = pendingToken;
  try {
    await apiFetch('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, provider: 'apns_voip', platform: 'ios', device_name: 'iOS VoIP', call_ring: true }),
    });
    tokenSent = token;
  } catch {
    /* retried at the next sign-in or app start */
  }
}

/** Called by the app when the signed-in state changes. */
export function setVoipAuth(ready: boolean): void {
  authReady = ready;
  if (ready) void flushVoipToken();
}

/**
 * Starts listening for VoIP pushes. Not tied to being signed in: a VoIP push wakes a killed app before the session is restored and the
 * system requires CallKit to show a call for it at once. Only the token upload waits for the session (setVoipAuth).
 */
export async function startVoipListeners(): Promise<boolean> {
  if (Platform.OS !== 'ios' || started || !canRingNatively()) return false;
  const voip = loadVoip();
  if (!voip) return false;
  started = true;
  voip.addEventListener('register', (token) => {
    pendingToken = token;
    void flushVoipToken();
  });
  voip.addEventListener('notification', (n) => {
    const data = n.data ?? n._data;
    void handleRingPayload(data);
  });
  voip.registerVoipToken();
  return true;
}

export function resetVoipPushForTests(): void {
  started = false;
  pendingToken = null;
  authReady = false;
  tokenSent = null;
}
