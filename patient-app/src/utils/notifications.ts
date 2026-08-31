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
    console.log('Must use physical device for Push Notifications');
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
      console.log('Failed to get push token for push notification!');
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
      } catch (e) {
        console.warn('Native FCM token unavailable, falling back to Expo token:', e);
      }
    }
    if (!token) {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      // Skip Expo push token when no valid EAS projectId is configured (Expo Go / local dev)
      const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!projectId || !uuidRe.test(projectId)) {
        console.log('No valid EAS projectId configured — skipping Expo push token (Expo Go/dev).');
        return null;
      }
      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      } catch (e) {
        console.warn('Could not get push token:', e);
        return null;
      }
      token = tokenData?.data;
    }

    // Register token with backend
    await apiFetch('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        provider,
        platform: Platform.OS,
        device_name: Device.modelName || 'Device',
      }),
    });

    console.log('Push token registered successfully:', token);

    // Set up Android notification channel for calls
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B30',
        sound: 'default', // Can customize sound here
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
    console.error('Error registering push token', e);
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
