const SETTINGS_KEYS = ["general", "appointments", "orders", "offers", "medications", "doctorMessages", "emergency", "sound", "vibration"] as const;
export type NotificationSettings = Partial<Record<(typeof SETTINGS_KEYS)[number], boolean>>;

export function extractNotificationSettings(payload: unknown): NotificationSettings {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root;
  return Object.fromEntries(SETTINGS_KEYS.flatMap((key) => typeof data[key] === "boolean" ? [[key, data[key]]] : [])) as NotificationSettings;
}

/**
 * The shape GET /users/me/notification-settings really returns (and PATCH accepts):
 * `{ channels: { push, email, sms }, categories: { appointments, orders, health, chat, account, marketing } }`.
 * Only known booleans are kept.
 */
export const NOTIFICATION_CATEGORIES = ["appointments", "orders", "health", "chat", "account", "marketing"] as const;
export const NOTIFICATION_CHANNELS = ["push", "email", "sms"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationPreferences = {
  categories: Partial<Record<NotificationCategory, boolean>>;
  channels: Partial<Record<NotificationChannel, boolean>>;
};

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function booleansOf<K extends string>(source: Record<string, unknown>, keys: readonly K[]): Partial<Record<K, boolean>> {
  return Object.fromEntries(keys.flatMap((key) => typeof source[key] === "boolean" ? [[key, source[key]]] : [])) as Partial<Record<K, boolean>>;
}

export function extractNotificationPreferences(payload: unknown): NotificationPreferences {
  const root = recordOf(payload);
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? recordOf(root.data) : root;
  return {
    categories: booleansOf(recordOf(data.categories), NOTIFICATION_CATEGORIES),
    channels: booleansOf(recordOf(data.channels), NOTIFICATION_CHANNELS),
  };
}
