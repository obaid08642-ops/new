import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

    const projectId =
      process.env.EXPO_PUBLIC_PROJECT_ID ||
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('Push registration skipped: EXPO_PUBLIC_PROJECT_ID is not configured');
      return null;
    }

    // Get Expo push token
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
    } catch (e) {
      console.warn('Could not get push token:', e);
      return null;
    }
    const token = tokenData?.data;

    // Register token with backend
    await apiFetch('/push/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        provider: 'expo',
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
