import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const SCHEDULE_STORE = 'nabdah:medication-notification-ids:v1';
const PREFERENCES_STORE = 'nabdah:medication-notification-preferences:v1';
const SNOOZE_STORE = 'nabdah:medication-snooze-notification-ids:v1';
const DOSE_ACTION_STORE = 'nabdah:medication-dose-actions:v1';

export const MEDICATION_ACTION_TAKEN = 'MEDICATION_TAKEN';
export const MEDICATION_ACTION_SNOOZE = 'MEDICATION_SNOOZE_10';
export const MEDICATION_CATEGORY_DEFAULT = 'medication_default';
export const MEDICATION_CATEGORY_IMPORTANT = 'medication_important';
export const MEDICATION_CHANNEL_DEFAULT = 'medication_default';
export const MEDICATION_CHANNEL_IMPORTANT = 'medication_important';

type NotificationIds = Record<string, string[]>;
export type MedicationNotificationPreferences = {
  important?: boolean;
  refill_lead_days?: 2 | 3;
};
export type LocalMedicationReminder = {
  id: string;
  medicine_name_ar?: string;
  medicine_name_en?: string;
  dose: string;
  times?: string[];
  frequency?: 'daily' | 'weekly' | 'as_needed' | string;
  active?: boolean;
};
export type MedicationNotificationCopy = {
  title: string;
  body: string;
  taken: string;
  snooze: string;
  permissionDenied: string;
};

type MedicationNotificationData = {
  type: 'medication_reminder';
  reminder_id: string;
  time_key: string;
  source: 'local';
  screen: '/health/medication-reminder-list';
  important: 'true' | 'false';
  snoozed?: 'true';
};

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(String(value || '').trim());
  if (!match) return null;
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

async function getMap<T>(key: string): Promise<Record<string, T>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function setMap<T>(key: string, value: Record<string, T>): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function permissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED);
}

/**
 * Local medication notifications intentionally use device permissions and device scheduling.
 * They do not claim cross-device delivery or bypass Focus/silent settings.
 */
export async function configureMedicationNotifications(copy: Pick<MedicationNotificationCopy, 'taken' | 'snooze'>): Promise<boolean> {
  if (!(await permissionGranted())) return false;

  await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY_DEFAULT, [
    { identifier: MEDICATION_ACTION_TAKEN, buttonTitle: copy.taken, options: { opensAppToForeground: true } },
    { identifier: MEDICATION_ACTION_SNOOZE, buttonTitle: copy.snooze, options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY_IMPORTANT, [
    { identifier: MEDICATION_ACTION_TAKEN, buttonTitle: copy.taken, options: { opensAppToForeground: true } },
    { identifier: MEDICATION_ACTION_SNOOZE, buttonTitle: copy.snooze, options: { opensAppToForeground: true } },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_DEFAULT, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#4F46E5',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_IMPORTANT, {
      name: 'Important medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 180, 300, 180, 300],
      lightColor: '#E11D48',
      sound: 'default',
    });
  }
  return true;
}

export async function getMedicationNotificationPreferences(reminderId: string): Promise<MedicationNotificationPreferences> {
  const records = await getMap<MedicationNotificationPreferences>(PREFERENCES_STORE);
  const current = records[reminderId] || {};
  return { important: Boolean(current.important), refill_lead_days: current.refill_lead_days === 2 ? 2 : 3 };
}

export async function setMedicationNotificationPreferences(reminderId: string, patch: MedicationNotificationPreferences): Promise<MedicationNotificationPreferences> {
  const records = await getMap<MedicationNotificationPreferences>(PREFERENCES_STORE);
  const current = records[reminderId] || {};
  const next: MedicationNotificationPreferences = {
    important: patch.important ?? Boolean(current.important),
    refill_lead_days: patch.refill_lead_days === 2 ? 2 : patch.refill_lead_days === 3 ? 3 : (current.refill_lead_days === 2 ? 2 : 3),
  };
  records[reminderId] = next;
  await setMap(PREFERENCES_STORE, records);
  return next;
}

export async function cancelMedicationNotifications(reminderId: string): Promise<void> {
  const records = await getMap<string[]>(SCHEDULE_STORE);
  const ids = records[reminderId] || [];
  await Promise.all(ids.map(async (id) => {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }
  }));
  delete records[reminderId];
  await setMap(SCHEDULE_STORE, records);
  await cancelMedicationSnoozes(reminderId);
}

/** Cancels only one-off snoozes; recurring medication schedules remain active. */
export async function cancelMedicationSnoozes(reminderId: string, timeKey?: string): Promise<void> {
  const records = await getMap<string[]>(SNOOZE_STORE);
  const keys = Object.keys(records).filter((key) => key === reminderId || (timeKey ? key === `${reminderId}:${timeKey}` : key.startsWith(`${reminderId}:`)));
  const ids = keys.flatMap((key) => records[key] || []);
  await Promise.all(ids.map(async (id) => {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* already delivered or cancelled */ }
  }));
  keys.forEach((key) => delete records[key]);
  await setMap(SNOOZE_STORE, records);
}

function notificationData(reminder: LocalMedicationReminder, timeKey: string, important: boolean, snoozed = false): MedicationNotificationData {
  return {
    type: 'medication_reminder',
    reminder_id: reminder.id,
    time_key: timeKey,
    source: 'local',
    screen: '/health/medication-reminder-list',
    important: important ? 'true' : 'false',
    ...(snoozed ? { snoozed: 'true' } : {}),
  };
}

/** Schedules daily or weekly local reminders. `as_needed` remains unscheduled by design. */
export async function scheduleMedicationNotifications(
  reminder: LocalMedicationReminder,
  copy: MedicationNotificationCopy,
  preferences?: MedicationNotificationPreferences,
): Promise<{ scheduled: number; permissionDenied: boolean }> {
  await cancelMedicationNotifications(reminder.id);
  if (!reminder.active || reminder.frequency === 'as_needed' || Platform.OS === 'web') return { scheduled: 0, permissionDenied: false };
  const ready = await configureMedicationNotifications(copy);
  if (!ready) return { scheduled: 0, permissionDenied: true };

  const important = Boolean(preferences?.important);
  const categoryIdentifier = important ? MEDICATION_CATEGORY_IMPORTANT : MEDICATION_CATEGORY_DEFAULT;
  const channelId = important ? MEDICATION_CHANNEL_IMPORTANT : MEDICATION_CHANNEL_DEFAULT;
  const ids: string[] = [];
  const title = copy.title;
  const body = copy.body;

  for (const timeKey of reminder.times || []) {
    const parsed = parseTime(timeKey);
    if (!parsed) continue;
    const common: any = { hour: parsed.hour, minute: parsed.minute, channelId };
    const trigger: any = reminder.frequency === 'weekly'
      ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: new Date().getDay() + 1, ...common }
      : { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...common };
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        categoryIdentifier,
        data: notificationData(reminder, timeKey, important),
      },
      trigger,
    });
    ids.push(id);
  }

  const records = await getMap<string[]>(SCHEDULE_STORE);
  records[reminder.id] = ids;
  await setMap(SCHEDULE_STORE, records);
  return { scheduled: ids.length, permissionDenied: false };
}

/** Adds a one-off ten-minute local snooze without changing the recurring schedule. */
export async function scheduleMedicationSnooze(
  reminder: LocalMedicationReminder,
  timeKey: string,
  copy: MedicationNotificationCopy,
  preferences?: MedicationNotificationPreferences,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const ready = await configureMedicationNotifications(copy);
  if (!ready) return null;
  const important = Boolean(preferences?.important);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      sound: 'default',
      categoryIdentifier: important ? MEDICATION_CATEGORY_IMPORTANT : MEDICATION_CATEGORY_DEFAULT,
      data: notificationData(reminder, timeKey, important, true),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10 * 60,
      repeats: false,
      channelId: important ? MEDICATION_CHANNEL_IMPORTANT : MEDICATION_CHANNEL_DEFAULT,
    } as any,
  });
  const records = await getMap<string[]>(SNOOZE_STORE);
  const key = `${reminder.id}:${timeKey}`;
  records[key] = [...(records[key] || []), id];
  await setMap(SNOOZE_STORE, records);
  return id;
}

export async function recordMedicationDoseAction(reminderId: string, timeKey: string, status: 'taken' | 'skipped', occurredAt = new Date().toISOString()): Promise<boolean> {
  const records = await getMap<{ reminder_id: string; time_key: string; status: 'taken' | 'skipped'; occurred_at: string }>(DOSE_ACTION_STORE);
  const key = `${reminderId}:${timeKey}:${occurredAt.slice(0, 10)}`;
  records[key] = { reminder_id: reminderId, time_key: timeKey, status, occurred_at: occurredAt };
  await setMap(DOSE_ACTION_STORE, records);
  return flushMedicationDoseActions();
}

/** Replays explicit local dose actions. A duplicate response is treated as safely reconciled. */
export async function flushMedicationDoseActions(): Promise<boolean> {
  const records = await getMap<{ reminder_id: string; time_key: string; status: 'taken' | 'skipped'; occurred_at: string }>(DOSE_ACTION_STORE);
  let changed = false;
  for (const [key, action] of Object.entries(records)) {
    try {
      await apiFetch(`/health/reminders/${action.reminder_id}/log`, { method: 'POST', body: JSON.stringify({ status: action.status, time_key: action.time_key, occurred_at: action.occurred_at }) });
      delete records[key];
      changed = true;
      if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);
    } catch (error: any) {
      const message = String(error?.message || '');
      // A duplicate means the server already has an equivalent confirmed action.
      if (message.includes('409') || message.includes('already logged')) {
        delete records[key];
        changed = true;
        if (action.status === 'taken') await cancelMedicationSnoozes(action.reminder_id, action.time_key);
      }
    }
  }
  if (changed) await setMap(DOSE_ACTION_STORE, records);
  return Object.keys(records).length === 0;
}

/** Repeats the exact visible reminder once after ten minutes without touching its recurring schedule. */
export async function snoozeMedicationNotificationResponse(response: Notifications.NotificationResponse): Promise<string | null> {
  const parsed = medicationNotificationAction(response);
  if (parsed.action !== 'snooze' || !parsed.reminderId || !parsed.timeKey || Platform.OS === 'web') return null;
  const original = response.notification.request.content;
  const data: any = { ...(original.data || {}), snoozed: 'true' };
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: original.title || '',
      body: original.body || '',
      subtitle: original.subtitle,
      sound: 'default',
      categoryIdentifier: original.categoryIdentifier || MEDICATION_CATEGORY_DEFAULT,
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10 * 60,
      repeats: false,
      channelId: data.important === 'true' ? MEDICATION_CHANNEL_IMPORTANT : MEDICATION_CHANNEL_DEFAULT,
    } as any,
  });
  const records = await getMap<string[]>(SNOOZE_STORE);
  const key = `${parsed.reminderId}:${parsed.timeKey}`;
  records[key] = [...(records[key] || []), id];
  await setMap(SNOOZE_STORE, records);
  return id;
}

export function medicationNotificationAction(response: Notifications.NotificationResponse): { action: 'taken' | 'snooze' | 'open' | 'ignore'; reminderId?: string; timeKey?: string } {
  const data: any = response.notification.request.content.data || {};
  if (data.type !== 'medication_reminder' || !data.reminder_id || !data.time_key) return { action: 'ignore' };
  if (response.actionIdentifier === MEDICATION_ACTION_TAKEN) return { action: 'taken', reminderId: String(data.reminder_id), timeKey: String(data.time_key) };
  if (response.actionIdentifier === MEDICATION_ACTION_SNOOZE) return { action: 'snooze', reminderId: String(data.reminder_id), timeKey: String(data.time_key) };
  return { action: 'open', reminderId: String(data.reminder_id), timeKey: String(data.time_key) };
}

export function medicationDisplayName(reminder: Pick<LocalMedicationReminder, 'medicine_name_ar' | 'medicine_name_en'>, fallback: string): string {
  return reminder.medicine_name_ar || reminder.medicine_name_en || fallback;
}
