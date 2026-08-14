// @ts-nocheck
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
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

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID?.trim();
    if (!projectId) return null;

    // Get Expo push token
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    } catch (e) {
      // Push token fetch failed — non-critical, skip silently
      return null;
    }
    const token = tokenData?.data;
    if (!token) return null;

    // Register token with backend
    try {
      await apiFetch('/push/register', {
        method: 'POST',
        body: JSON.stringify({
          token,
          provider: 'expo',
          platform: Platform.OS,
          device_name: Device.modelName || 'Device',
        }),
      });
    } catch {
      // A local token that is not registered server-side must not be treated as ready.
      return null;
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
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void,
) {
  // Listen for notifications received when app is open
  const incomingSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);

  // Listen for notification clicks (app is in background or closed)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    incomingSubscription.remove();
    responseSubscription.remove();
  };
}
