# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/utils/notifications.ts`
- **Member SHA-256:** `c9db5a26cbf781bcd26b41f0dc523469d054b7c4dd4c76c5c8b38a2de2662854`
- **Line count:** 145
- **Read range:** `1-145`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `37: export async function registerForPushNotificationsAsync(): Promise<string | null> {`
- `89: // Register token with backend`
- `91: await apiFetch('/push/register', {`
### backend_consumers_or_contracts
- `91: await apiFetch('/push/register', {`
### auth_ownership
- `46: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `50: const { status } = await Notifications.requestPermissionsAsync();`
- `55: // User denied push notification permission — graceful skip`
- `59: // Prefer native FCM token on Android (direct via our Firebase project);`
- `60: // fall back to Expo push service token otherwise (iOS until APNs keys arrive).`
- `61: let token: string | null = null;`
- `65: const nativeToken = await Notifications.getDevicePushTokenAsync();`
- `66: if (nativeToken?.data) {`
- `67: token = nativeToken.data as string;`
- `71: // Native FCM unavailable — fall back to Expo token`
- `74: if (!token) {`
- `77: let tokenData;`
### state_transitions
- `46: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `47: let finalStatus = existingStatus;`
- `49: if (existingStatus !== 'granted') {`
- `50: const { status } = await Notifications.requestPermissionsAsync();`
- `51: finalStatus = status;`
- `54: if (finalStatus !== 'granted') {`
- `83: // Push token fetch failed — non-critical, skip silently`
- `101: // Backend registration failed — non-critical`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `24: } catch { /* native module not ready — skip handler */ }`
- `25: } catch {`
- `70: } catch {`
- `82: } catch (e) {`
- `83: // Push token fetch failed — non-critical, skip silently`
- `100: } catch {`
- `101: // Backend registration failed — non-critical`
- `123: } catch (e) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
