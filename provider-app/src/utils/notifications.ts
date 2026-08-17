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
        }),
      });
    } catch {
      // Backend registration failed — non-critical
    }

    // Set up Android notification channel for calls
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B30',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    return token;
  } catch (e) {
    // Non-critical — push notifications degraded gracefully
    return null;
  }
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
