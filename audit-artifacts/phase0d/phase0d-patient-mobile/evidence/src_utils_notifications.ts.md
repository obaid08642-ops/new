# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/notifications.ts`
- **Member SHA-256:** `dcc1647c7cc88cdb9b48ffd707f247040d93d6fa8ee6b5ca57861d70456d1293`
- **Line count:** 122
- **Read range:** `1-122`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: export async function registerForPushNotificationsAsync(): Promise<string | null> {`
- `70: // Register token with backend`
- `71: await apiFetch('/push/register', {`
- `81: console.log('Push token registered successfully:', token);`
- `103: console.error('Error registering push token', e);`
### backend_consumers_or_contracts
- `71: await apiFetch('/push/register', {`
### auth_ownership
- `24: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `28: const { status } = await Notifications.requestPermissionsAsync();`
- `33: console.log('Failed to get push token for push notification!');`
- `37: // Prefer native FCM token on Android (direct via our Firebase project);`
- `38: // fall back to Expo push service token otherwise (iOS until APNs keys arrive).`
- `39: let token: string | null = null;`
- `43: const nativeToken = await Notifications.getDevicePushTokenAsync();`
- `44: if (nativeToken?.data) {`
- `45: token = nativeToken.data as string;`
- `49: console.warn('Native FCM token unavailable, falling back to Expo token:', e);`
- `52: if (!token) {`
- `54: // Skip Expo push token when no valid EAS projectId is configured (Expo Go / local dev)`
### state_transitions
- `24: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `25: let finalStatus = existingStatus;`
- `27: if (existingStatus !== 'granted') {`
- `28: const { status } = await Notifications.requestPermissionsAsync();`
- `29: finalStatus = status;`
- `32: if (finalStatus !== 'granted') {`
- `33: console.log('Failed to get push token for push notification!');`
- `81: console.log('Push token registered successfully:', token);`
- `103: console.error('Error registering push token', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `33: console.log('Failed to get push token for push notification!');`
- `48: } catch (e) {`
- `63: } catch (e) {`
- `102: } catch (e) {`
- `103: console.error('Error registering push token', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
