# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/Notifications.ts`
- **Member SHA-256:** `28550054de90144b5d3adf15a8c46335e8cf836383e3c80c33ce98a7571f899f`
- **Line count:** 135
- **Read range:** `1-135`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `119: public async cancelScheduled(identifier: string): Promise<void> {`
- `120: await Notifications.cancelScheduledNotificationAsync(identifier);`
- `124: await Notifications.cancelAllScheduledNotificationsAsync();`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: private pushToken: string | null = null;`
- `71: public async requestPermissions(): Promise<boolean> {`
- `72: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `76: const { status } = await Notifications.requestPermissionsAsync();`
- `83: public async getPushToken(): Promise<string | null> {`
- `84: if (this.pushToken) return this.pushToken;`
- `86: const hasPermission = await this.requestPermissions();`
- `87: if (!hasPermission) return null;`
- `92: log.info('No valid EAS projectId — skipping push token (Expo Go/dev)');`
- `96: const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });`
- `97: this.pushToken = tokenData.data;`
- `98: log.info('Push token generated', { token: this.pushToken });`
### state_transitions
- `72: const { status: existingStatus } = await Notifications.getPermissionsAsync();`
- `73: let finalStatus = existingStatus;`
- `75: if (existingStatus !== 'granted') {`
- `76: const { status } = await Notifications.requestPermissionsAsync();`
- `77: finalStatus = status;`
- `80: return finalStatus === 'granted';`
- `101: log.error('Failed to get push token', e);`
- `119: public async cancelScheduled(identifier: string): Promise<void> {`
- `120: await Notifications.cancelScheduledNotificationAsync(identifier);`
- `124: await Notifications.cancelAllScheduledNotificationsAsync();`
### payment_insurance_relevance
- `20: export interface NotificationPayload {`
- `106: public async scheduleLocal(payload: NotificationPayload, triggerMs: number): Promise<string> {`
- `109: title: payload.title,`
- `110: body: payload.body,`
- `111: data: payload.data,`
### error_empty_loading_retry_cancel
- `100: } catch (e) {`
- `101: log.error('Failed to get push token', e);`
- `119: public async cancelScheduled(identifier: string): Promise<void> {`
- `120: await Notifications.cancelScheduledNotificationAsync(identifier);`
- `124: await Notifications.cancelAllScheduledNotificationsAsync();`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
