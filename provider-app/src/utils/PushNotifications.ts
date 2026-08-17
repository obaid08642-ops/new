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


export async function setupPushNotifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return; // Expo Go / native module missing — skip silently
  if (!Device.isDevice) return; // Simulator — skip silently

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (!projectId) return;
  try {
    await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    // Token obtained — backend registration handled by notifications.ts
  } catch (e) {
    // Push token unavailable (Expo Go limitation / simulator) — silently skip
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }
}
