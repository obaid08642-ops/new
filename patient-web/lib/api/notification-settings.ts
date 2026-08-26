const SETTINGS_KEYS = ["general", "appointments", "orders", "offers", "medications", "doctorMessages", "emergency", "sound", "vibration"] as const;
export type NotificationSettings = Partial<Record<(typeof SETTINGS_KEYS)[number], boolean>>;

export function extractNotificationSettings(payload: unknown): NotificationSettings {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const data = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root;
  return Object.fromEntries(SETTINGS_KEYS.flatMap((key) => typeof data[key] === "boolean" ? [[key, data[key]]] : [])) as NotificationSettings;
}
