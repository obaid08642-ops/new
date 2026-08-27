import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { HttpClient } from '@/services/HttpClient';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

/**
 * Deep-link router — mirrors the backend push payload contract:
 *   data = { type, screen?, params?, thread_id?, order_id?, appointment_id?, campaign_id? }
 * Every notification must land on its exact screen, even from a cold start.
 */
/**
 * E2/S14: translate backend notification routes (NotificationsService contract)
 * into REAL expo-router app routes. Backend emits paths like `/orders/:id/tracking`,
 * `/tracking/:kind/:id`, `/labs/booking/view/:id` — none of which exist in the app;
 * without this translation every tapped notification died on an unmatched route.
 */
export function translateBackendRoute(route: string): { pathname: string; params?: Record<string, string> } | null {
  if (!route) return null;
  const clean = String(route).split('?')[0];

  let m = clean.match(/^\/orders\/([^/]+)\/tracking$/) || clean.match(/^\/orders\/([^/]+)$/);
  if (m) return { pathname: '/pharmacy/order-tracking', params: { orderId: m[1] } };

  m = clean.match(/^\/tracking\/([^/]+)\/([^/]+)$/);
  if (m) {
    const [, kind, id] = m;
    switch (kind) {
      case 'pharmacy': return { pathname: '/pharmacy/order-tracking', params: { orderId: id } };
      case 'lab': return { pathname: '/diagnostics/sample-tracking', params: { bookingId: id } };
      case 'radiology': return { pathname: '/diagnostics/order/[id]', params: { id } };
      case 'nursing': return { pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: id } };
      case 'consultation': return { pathname: '/consultations/appointment-detail', params: { appointmentId: id } };
      default: return { pathname: '/(tabs)/index' };
    }
  }

  m = clean.match(/^\/nursing\/tracking\/([^/]+)$/);
  if (m) return { pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: m[1] } };

  m = clean.match(/^\/labs\/booking\/view\/([^/]+)$/) || clean.match(/^\/labs\/bookings\/([^/]+)$/);
  if (m) return { pathname: '/diagnostics/order/[id]', params: { id: m[1] } };

  m = clean.match(/^\/radiology\/booking\/view\/([^/]+)$/);
  if (m) return { pathname: '/diagnostics/order/[id]', params: { id: m[1] } };

  m = clean.match(/^\/health\/results\/(.+)$/) || clean.match(/^\/health\/reports\/(.+)$/);
  if (m) return { pathname: '/reports/view-report', params: { reportId: m[1] } };

  // Routes that already exist verbatim in the app
  if (clean === '/consultations/appointments') return { pathname: clean };
  if (clean === '/diagnostics/results-history') return { pathname: clean };
  // Verbatim app routes used by backend notification action.route (EPIC4/EPIC5 listeners)
  const VERBATIM_ROUTES = new Set([
    '/insurance/hub', '/wallet/hub', '/returns/hub',
    '/loyalty/hub', '/loyalty/referrals', '/loyalty/challenges',
    '/family/hub', '/ai/symptom-timeline', '/emergency/tracking',
  ]);
  if (VERBATIM_ROUTES.has(clean)) return { pathname: clean };

  return null;
}

export function routeFromNotificationData(data: any): void {
  if (!data || typeof data !== 'object') return;
  try {
    // 1) Explicit screen from backend — translated to a real app route first
    if (data.screen && typeof data.screen === 'string') {
      const params = typeof data.params === 'string' ? safeParse(data.params) : data.params;
      const translated = translateBackendRoute(data.screen);
      if (translated) {
        router.push({ pathname: translated.pathname as any, params: { ...(translated.params || {}), ...(params || {}) } } as any);
      } else {
        // Unknown backend route — never dump the user on Home silently; open the inbox
        router.push('/notifications/index' as any);
      }
      return;
    }

    // 2) Type-based fallbacks (event-driven notifications) — real app routes only
    switch (data.type) {
      case 'chat':
        router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: data.senderId, doctorName: data.senderName } } as any);
        break;
      case 'call':
      case 'call_missed':
        router.push('/consultations/appointments' as any);
        break;
      case 'order':
      case 'delivery':
      case 'payment':
      case 'payment_failed':
        router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: data.order_id || data.orderId } } as any);
        break;
      case 'booking':
      case 'reminder':
      case 'appointment':
        router.push('/consultations/appointments' as any);
        break;
      case 'retarget':
        router.push('/pharmacy/cart' as any);
        break;
      case 'report':
      case 'lab':
      case 'lab_booking':
      case 'radiology':
        router.push('/diagnostics/my-results' as any);
        break;
      case 'nursing_transit':
      case 'nursing_arrived':
      case 'nursing_visit':
        router.push({ pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: data.bookingId || data.booking_id } } as any);
        break;
      case 'nursing_completed':
        router.push('/nursing/service-details' as any);
        break;
      case 'refund':
      case 'return':
        router.push('/returns/hub' as any);
        break;
      case 'insurance':
        router.push('/insurance/hub' as any);
        break;
      case 'family':
        router.push('/family/hub' as any);
        break;
      case 'wallet':
      case 'topup':
        router.push('/wallet/hub' as any);
        break;
      case 'medication':
      case 'medication_reminder':
        router.push('/health/medication-reminder-list' as any);
        break;
      case 'loyalty':
      case 'promotion':
      case 'offer':
        router.push('/loyalty/hub' as any);
        break;
      case 'sos':
      case 'ambulance':
      case 'emergency':
        router.push('/emergency/tracking' as any);
        break;
      default: {
        // action payload embedded as JSON string (NotificationsService contract)
        const action = typeof data.action === 'string' ? safeParse(data.action) : data.action;
        if (action?.route) {
          const translated = translateBackendRoute(action.route);
          if (translated) {
            router.push({ pathname: translated.pathname as any, params: { ...(translated.params || {}), ...(action.payload || {}) } } as any);
          } else {
            router.push('/notifications/index' as any);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Deep-link routing failed:', e);
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}

/** Report engagement to the backend → powers admin open-rate/CTR analytics. */
function trackEngagement(event: 'received' | 'opened' | 'clicked', data: any): void {
  HttpClient.post('/push/events', {
    event,
    notification_id: data?.notification_id,
    campaign_id: data?.campaign_id,
    data: { type: data?.type },
  }).catch(() => { /* analytics must never break UX */ });
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      if (projectId && uuidRe.test(String(projectId))) try {
        token = await Notifications.getExpoPushTokenAsync({ projectId });

        // 1) Expo token → Expo Push API channel
        await HttpClient.post('/notifications/register-token', {
          token: token.data,
          provider: 'expo',
          platform: Platform.OS,
        });
      } catch (e) {
        console.error('Error fetching Expo token:', e);
      }

      // 2) Native device token → FCM (Android) / APNs (iOS) direct channel.
      //    Requires a development/production build (not Expo Go) — wrapped
      //    defensively so Expo Go sessions still work via the Expo token.
      try {
        const nativeToken = await Notifications.getDevicePushTokenAsync();
        if (nativeToken?.data) {
          await HttpClient.post('/notifications/register-token', {
            token: nativeToken.data,
            provider: Platform.OS === 'ios' ? 'apns' : 'fcm',
            platform: Platform.OS,
          });
        }
      } catch {
        // Expo Go / missing native config — Expo channel above already covers us
      }
    } else {
      console.warn('Must use physical device for Push Notifications');
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Foreground receipt → track 'received' for delivery analytics
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      trackEngagement('received', notification.request.content.data);
    });

    // Tap (background OR killed app) → deep link + track 'opened'
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      trackEngagement('opened', data);
      trackEngagement('clicked', data);
      routeFromNotificationData(data);
    });

    // Cold start: app launched BY a notification tap while killed
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        trackEngagement('opened', data);
        // Slight delay so the root navigator is mounted before routing
        setTimeout(() => routeFromNotificationData(data), 500);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
};
