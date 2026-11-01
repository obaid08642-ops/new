// @ts-nocheck
// expo-notifications touches NATIVE modules at import time — in Expo Go (SDK 53+)
// importing it during app boot throws "[runtime not ready]: Tried to insert a
// NativeModule" and kills AppRegistry registration. So NOTHING native is touched
// at module scope: the module is loaded lazily on first use instead.
let Notifications: any = null;
let notificationsInit = false;

function getNotifications(): any {
  if (!notificationsInit) {
    notificationsInit = true;
    try {
      Notifications = require('expo-notifications');
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch { /* native module not ready — skip handler */ }
    } catch {
      Notifications = null;
    }
  }
  return Notifications;
}
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';
import { canRingNatively } from './callkeep';

// Configure notification behavior

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  if (!Device.isDevice) {
    // Simulator/emulator — skip silently
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // User denied push notification permission — graceful skip
      return null;
    }

    // Prefer native FCM token on Android (direct via our Firebase project);
    // fall back to Expo push service token otherwise (iOS until APNs keys arrive).
    let token: string | null = null;
    let provider: 'fcm' | 'expo' = 'expo';
    if (Platform.OS === 'android') {
      try {
        const nativeToken = await Notifications.getDevicePushTokenAsync();
        if (nativeToken?.data) {
          token = nativeToken.data as string;
          provider = 'fcm';
        }
      } catch {
        // Native FCM unavailable — fall back to Expo token
      }
    }
    if (!token) {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      if (!projectId) return null;
      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
      } catch (e) {
        // Push token fetch failed — non-critical, skip silently
        return null;
      }
      token = tokenData?.data;
    }

    // Register token with backend
    try {
      await apiFetch('/push/register', {
        method: 'POST',
        body: JSON.stringify({
          token,
          provider,
          platform: Platform.OS,
          device_name: Device.modelName || 'Device',
          // a device with the native call module rings itself from a data-only push (killed app, locked phone)
          call_ring: canRingNatively(),
        }),
      });
    } catch {
      // Backend registration failed — non-critical
    }

    await ensureAndroidChannels();

    return token;
  } catch (e) {
    // Non-critical — push notifications degraded gracefully
    return null;
  }
}

/**
 * Android channels, created once and before any push can arrive (a push to a channel that does not exist falls back to the
 * quiet default). `new_order` is the loud one for new orders and bookings: its own name in the phone's settings, maximum
 * importance (heads-up on the lock screen), a long vibration and its own sound (assets/sounds/new_order.wav, bundled by the
 * expo-notifications plugin in app.json). `calls` is separate so it can be tuned on its own; `default` (HIGH) carries chat messages and every other notice.
 */
export async function ensureAndroidChannels(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || Platform.OS !== 'android') return;
  const { AndroidImportance, AndroidNotificationVisibility } = Notifications;
  const channels: Array<[string, Record<string, unknown>]> = [
    ['new_order', { name: 'New orders and bookings', importance: AndroidImportance.MAX, sound: 'new_order.wav', vibrationPattern: [0, 600, 250, 600, 250, 600], lightColor: '#D42A38', lockscreenVisibility: AndroidNotificationVisibility.PUBLIC, enableVibrate: true }],
    ['calls', { name: 'Calls', importance: AndroidImportance.MAX, sound: 'default', vibrationPattern: [0, 500, 300, 500, 300, 500], lightColor: '#D42A38', lockscreenVisibility: AndroidNotificationVisibility.PUBLIC }],
    // messages and every other provider notice: heads-up, but private on the lock screen
    ['default', { name: 'Messages and updates', importance: AndroidImportance.HIGH, sound: 'default', vibrationPattern: [0, 250, 150, 250], lockscreenVisibility: AndroidNotificationVisibility.PRIVATE }],
  ];
  for (const [id, spec] of channels) {
    try { await Notifications.setNotificationChannelAsync(id, spec); } catch { /* one channel failing must not stop the others */ }
  }
}

/** The notification the user tapped to start the app from a killed state (null when the app was opened normally). */
export async function getLastPushResponse(): Promise<any | null> {
  const Notifications = getNotifications();
  if (!Notifications?.getLastNotificationResponseAsync) return null;
  try { return (await Notifications.getLastNotificationResponseAsync()) ?? null; } catch { return null; }
}

export function initNotificationListeners(
  onNotificationReceived: (notification: any) => void,
  onNotificationResponse: (response: any) => void,
) {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};
  // Listen for notifications received when app is open
  const incomingSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Listen for notification clicks (app is in background or closed)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    incomingSubscription.remove();
    responseSubscription.remove();
  };
}
