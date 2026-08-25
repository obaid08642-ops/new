# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/components/NotificationHandler.tsx`
- **Member SHA-256:** `a0134cfc29c2cc0b5a93a285876a5f2e6e86f5e09fd9d5c7ee59248da9553256`
- **Line count:** 162
- **Read range:** `1-162`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `5: import { registerForPushNotificationsAsync, initNotificationListeners } from '../utils/notifications';`
- `23: * screen — even when the app is terminated.`
- `25: * { screen: '/route/path', params: {...} } which takes precedence.`
- `26: * Screens are whitelisted below to prevent open-redirect navigation.`
- `28: const ALLOWED_SCREENS = new Set([`
- `31: '/consultations/booking-pending',`
- `51: // Legacy type → screen resolver (kept for backward compatibility)`
- `52: function resolveLegacyRoute(data: any): { pathname: string; params: Record<string, any> } | null {`
- `61: return data.bookingId`
- `62: ? { pathname: '/consultations/appointment-detail', params: { id: data.bookingId } }`
- `65: case 'booking_accepted':`
### backend_consumers_or_contracts
- `5: import { registerForPushNotificationsAsync, initNotificationListeners } from '../utils/notifications';`
- `29: '/consultations/appointments',`
- `38: '/pharmacy/order-tracking',`
- `39: '/pharmacy/cart',`
- `40: '/diagnostics/orders',`
- `43: '/insurance',`
- `44: '/payments/wallet',`
- `45: '/notifications',`
- `59: return { pathname: '/pharmacy/order-tracking', params: { orderId: data.orderId } };`
- `63: : { pathname: '/consultations/appointments', params: {} };`
- `69: return { pathname: '/insurance', params: { requestId: data.requestId } };`
- `75: return { pathname: '/payments/wallet', params: {} };`
### auth_ownership
- `10: /** Report engagement to the backend → powers admin open-rate / CTR analytics. */`
- `87: // Register token with backend and reconcile explicit local medication actions.`
- `94: displayNativeIncomingCall(data.session_id || data.sessionId, data.caller_name || data.callerName || 'طبيب نبض', (data.call_type || data.callType) !== 'voice');`
- `146: displayNativeIncomingCall(data.session_id || data.sessionId, data.caller_name || data.callerName || 'طبيب نبض', (data.call_type || data.callType) !== 'voice');`
### state_transitions
- `31: '/consultations/booking-pending',`
- `66: return { pathname: '/consultations/booking-pending', params: { appointmentId: data.appointmentId, visitType: data.visitType } };`
- `74: case 'refund_status':`
- `82: const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);`
- `89: flushMedicationDoseActions().catch(() => { /* a later app launch will retry */ });`
- `111: // App launched by tapping a notification (terminated state)`
### payment_insurance_relevance
- `43: '/insurance',`
- `44: '/payments/wallet',`
- `47: '/offers',`
- `67: case 'insurance_decision':`
- `68: case 'copay_due':`
- `69: return { pathname: '/insurance', params: { requestId: data.requestId } };`
- `74: case 'refund_status':`
- `75: return { pathname: '/payments/wallet', params: {} };`
### error_empty_loading_retry_cancel
- `18: }).catch(() => { /* analytics must never break UX */ });`
- `31: '/consultations/booking-pending',`
- `66: return { pathname: '/consultations/booking-pending', params: { appointmentId: data.appointmentId, visitType: data.visitType } };`
- `89: flushMedicationDoseActions().catch(() => { /* a later app launch will retry */ });`
- `117: await recordMedicationDoseAction(medicationAction.reminderId, medicationAction.timeKey, 'taken').catch(() => { /* local queue persists the explicit action */ });`
- `120: await snoozeMedicationNotificationResponse(response).catch(() => { /* original reminder remains visible if scheduling fails */ });`
- `132: await recordMedicationDoseAction(medicationAction.reminderId, medicationAction.timeKey, 'taken').catch(() => { /* local queue persists the explicit action */ });`
- `135: await snoozeMedicationNotificationResponse(response).catch(() => { /* original reminder remains visible if scheduling fails */ });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
