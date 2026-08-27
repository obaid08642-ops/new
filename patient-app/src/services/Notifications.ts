import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './Logger';

const log = logger.scope('Notifications');

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType = 'push' | 'local' | 'silent' | 'scheduled';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
}

class NotificationsManager {
  private static instance: NotificationsManager;
  private pushToken: string | null = null;
  private listeners: Notifications.Subscription[] = [];

  private constructor() {}

  public static getInstance(): NotificationsManager {
    if (!NotificationsManager.instance) {
      NotificationsManager.instance = new NotificationsManager();
    }
    return NotificationsManager.instance;
  }

  public async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Setup basic listeners
    this.listeners.push(
      Notifications.addNotificationReceivedListener(notification => {
        log.info('Notification received in foreground', { notification });
      }),
      Notifications.addNotificationResponseReceivedListener(response => {
        log.info('User interacted with notification', { response });
        this.handleNotificationTap(response);
      })
    );
  }

  private handleNotificationTap(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    if (data?.url) {
      // Deep link routing logic here (Phase 1B integration)
    }
  }

  public async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  public async getPushToken(): Promise<string | null> {
    if (this.pushToken) return this.pushToken;
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!projectId || !uuidRe.test(projectId)) {
      log.info('No valid EAS projectId — skipping push token (Expo Go/dev)');
      return null;
    }
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.pushToken = tokenData.data;
      log.info('Push token generated', { token: this.pushToken });
      return this.pushToken;
    } catch (e) {
      log.error('Failed to get push token', e);
      return null;
    }
  }

  public async scheduleLocal(payload: NotificationPayload, triggerMs: number): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data,
      },
      trigger: {
        seconds: Math.floor(triggerMs / 1000)
      } as any,
    });
  }

  public async cancelScheduled(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  
  public async clearAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  public cleanup(): void {
    this.listeners.forEach(l => l.remove());
    this.listeners = [];
  }
}

export const notifications = NotificationsManager.getInstance();
