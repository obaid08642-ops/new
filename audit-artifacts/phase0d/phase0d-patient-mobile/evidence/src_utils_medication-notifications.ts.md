# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/medication-notifications.ts`
- **Member SHA-256:** `0899eb2483664c25d7026549f57ce49f5dc179610da033cbe985c66a8991c527`
- **Line count:** 320
- **Read range:** `1-320`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `45: screen: '/health/medication-reminder-list';`
- `132: export async function cancelMedicationNotifications(reminderId: string): Promise<void> {`
- `136: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `140: await cancelMedicationSnoozes(reminderId);`
- `143: /** Cancels only one-off snoozes; recurring medication schedules remain active. */`
- `144: export async function cancelMedicationSnoozes(reminderId: string, timeKey?: string): Promise<void> {`
- `149: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `161: screen: '/health/medication-reminder-list',`
- `173: await cancelMedicationNotifications(reminder.id);`
- `266: if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);`
- `273: if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);`
### backend_consumers_or_contracts
- `263: await apiFetch(`/health/reminders/${action.reminder_id}/log`, { method: 'POST', body: JSON.stringify({ status: action.status, time_key: action.time_key, occurred_at: action.occurred_at }) });`
### auth_ownership
- `37: permissionDenied: string;`
- `71: async function permissionGranted(): Promise<boolean> {`
- `73: const current = await Notifications.getPermissionsAsync();`
- `74: if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) return true;`
- `75: const requested = await Notifications.requestPermissionsAsync();`
- `76: return Boolean(requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED);`
- `80: * Local medication notifications intentionally use device permissions and device scheduling.`
- `84: if (!(await permissionGranted())) return false;`
- `172: ): Promise<{ scheduled: number; permissionDenied: boolean }> {`
- `178: return { scheduled: 0, permissionDenied: false };`
- `181: if (!ready) return { scheduled: 0, permissionDenied: true };`
- `213: return { scheduled: ids.length, permissionDenied: false };`
### state_transitions
- `74: if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) return true;`
- `76: return Boolean(requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED);`
- `132: export async function cancelMedicationNotifications(reminderId: string): Promise<void> {`
- `136: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `140: await cancelMedicationSnoozes(reminderId);`
- `143: /** Cancels only one-off snoozes; recurring medication schedules remain active. */`
- `144: export async function cancelMedicationSnoozes(reminderId: string, timeKey?: string): Promise<void> {`
- `149: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `173: await cancelMedicationNotifications(reminder.id);`
- `249: export async function recordMedicationDoseAction(reminderId: string, timeKey: string, status: 'taken' | 'skipped', occurredAt = new Date().toISOString()): Promise<boolean> {`
- `250: const records = await getMap<{ reminder_id: string; time_key: string; status: 'taken' | 'skipped'; occurred_at: string }>(DOSE_ACTION_STORE);`
- `252: records[key] = { reminder_id: reminderId, time_key: timeKey, status, occurred_at: occurredAt };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `62: } catch {`
- `132: export async function cancelMedicationNotifications(reminderId: string): Promise<void> {`
- `136: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `140: await cancelMedicationSnoozes(reminderId);`
- `143: /** Cancels only one-off snoozes; recurring medication schedules remain active. */`
- `144: export async function cancelMedicationSnoozes(reminderId: string, timeKey?: string): Promise<void> {`
- `149: try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }`
- `173: await cancelMedicationNotifications(reminder.id);`
- `266: if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);`
- `267: } catch (error: any) {`
- `268: const message = String(error?.message || '');`
- `273: if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
