# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/hooks/usePushNotifications.ts`
- **Member SHA-256:** `11b246c02c7aef7e5a3f5d1be9cb9673aede90383d677c769351d40d6c5631e5`
- **Line count:** 304
- **Read range:** `1-304`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { router } from 'expo-router';`
- `23: * Deep-link router — mirrors the backend push payload contract:`
- `24: *   data = { type, screen?, params?, thread_id?, order_id?, appointment_id?, campaign_id? }`
- `25: * Every notification must land on its exact screen, even from a cold start.`
- `28: * E2/S14: translate backend notification routes (NotificationsService contract)`
- `29: * into REAL expo-router app routes. Backend emits paths like `/orders/:id/tracking`,`
- `30: * `/tracking/:kind/:id`, `/labs/booking/view/:id` — none of which exist in the app;`
- `31: * without this translation every tapped notification died on an unmatched route.`
- `33: export function translateBackendRoute(route: string): { pathname: string; params?: Record<string, string> } | null {`
- `34: if (!route) return null;`
- `35: const clean = String(route).split('?')[0];`
- `45: case 'lab': return { pathname: '/diagnostics/sample-tracking', params: { bookingId: id } };`
### backend_consumers_or_contracts
- `29: * into REAL expo-router app routes. Backend emits paths like `/orders/:id/tracking`,`
- `30: * `/tracking/:kind/:id`, `/labs/booking/view/:id` — none of which exist in the app;`
- `37: let m = clean.match(/^\/orders\/([^/]+)\/tracking$/) || clean.match(/^\/orders\/([^/]+)$/);`
- `38: if (m) return { pathname: '/pharmacy/order-tracking', params: { orderId: m[1] } };`
- `44: case 'pharmacy': return { pathname: '/pharmacy/order-tracking', params: { orderId: id } };`
- `47: case 'nursing': return { pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: id } };`
- `53: m = clean.match(/^\/nursing\/tracking\/([^/]+)$/);`
- `54: if (m) return { pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: m[1] } };`
- `56: m = clean.match(/^\/labs\/booking\/view\/([^/]+)$/) || clean.match(/^\/labs\/bookings\/([^/]+)$/);`
- `59: m = clean.match(/^\/radiology\/booking\/view\/([^/]+)$/);`
- `66: if (clean === '/consultations/appointments') return { pathname: clean };`
- `70: '/insurance/hub', '/wallet/hub', '/returns/hub',`
### auth_ownership
- `10: expoPushToken?: Notifications.ExpoPushToken;`
- `182: /** Report engagement to the backend → powers admin open-rate/CTR analytics. */`
- `193: const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();`
- `199: let token;`
- `217: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `220: const { status } = await Notifications.requestPermissionsAsync();`
- `224: console.warn('Failed to get push token for push notification!');`
- `232: token = await Notifications.getExpoPushTokenAsync({ projectId });`
- `234: // 1) Expo token → Expo Push API channel`
- `235: await HttpClient.post('/notifications/register-token', {`
- `236: token: token.data,`
- `241: console.error('Error fetching Expo token:', e);`
### state_transitions
- `1: import { useState, useEffect, useRef } from 'react';`
- `9: export interface PushNotificationState {`
- `107: case 'payment_failed':`
- `129: case 'nursing_completed':`
- `132: case 'refund':`
- `174: console.warn('Deep-link routing failed:', e);`
- `192: export const usePushNotifications = (): PushNotificationState => {`
- `193: const [expoPushToken, setExpoPushToken] = useState<Notifications.ExpoPushToken | undefined>();`
- `194: const [notification, setNotification] = useState<Notifications.Notification | undefined>();`
- `217: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `218: let finalStatus = existingStatus;`
- `219: if (existingStatus !== 'granted') {`
### payment_insurance_relevance
- `23: * Deep-link router — mirrors the backend push payload contract:`
- `70: '/insurance/hub', '/wallet/hub', '/returns/hub',`
- `106: case 'payment':`
- `107: case 'payment_failed':`
- `132: case 'refund':`
- `136: case 'insurance':`
- `137: router.push('/insurance/hub' as any);`
- `142: case 'wallet':`
- `144: router.push('/wallet/hub' as any);`
- `152: case 'offer':`
- `161: // action payload embedded as JSON string (NotificationsService contract)`
- `166: router.push({ pathname: translated.pathname as any, params: { ...(translated.params || {}), ...(action.payload || {}) } } as any);`
### error_empty_loading_retry_cancel
- `107: case 'payment_failed':`
- `173: } catch (e) {`
- `174: console.warn('Deep-link routing failed:', e);`
- `179: try { return JSON.parse(s); } catch { return undefined; }`
- `189: }).catch(() => { /* analytics must never break UX */ });`
- `224: console.warn('Failed to get push token for push notification!');`
- `240: } catch (e) {`
- `241: console.error('Error fetching Expo token:', e);`
- `256: } catch {`
- `289: setTimeout(() => routeFromNotificationData(data), 500);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
