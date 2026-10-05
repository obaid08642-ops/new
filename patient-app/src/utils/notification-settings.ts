/**
 * Q38: notification preferences.
 *
 * The server stores `{ channels: {push,email,sms}, categories: {appointments,
 * orders,health,chat,account,marketing} }` (backend users.service.ts
 * normalizeNotificationSettings). The screen shows flat switches. The
 * owner-decided mapping (HANDOFF §5, same table as UsersService
 * NOTIFICATION_FLAT_MAP) is used in BOTH directions so a reload shows what was
 * saved. `emergency` is always on and locked; `sound`/`vibration` are
 * device-local and never sent to the server.
 */
export type ServerGroup = 'channels' | 'categories';
export type ServerTarget = { group: ServerGroup; key: string };

export const SERVER_SWITCHES = {
  general: { group: 'channels', key: 'push' },
  appointments: { group: 'categories', key: 'appointments' },
  orders: { group: 'categories', key: 'orders' },
  medications: { group: 'categories', key: 'health' },
  doctorMessages: { group: 'categories', key: 'chat' },
  offers: { group: 'categories', key: 'marketing' },
} as const satisfies Record<string, ServerTarget>;

export type ServerSwitchKey = keyof typeof SERVER_SWITCHES;
export const DEVICE_SWITCHES = ['sound', 'vibration'] as const;
export type DeviceSwitchKey = (typeof DEVICE_SWITCHES)[number];
export type SwitchKey = ServerSwitchKey | DeviceSwitchKey | 'emergency';
export type SwitchState = Record<SwitchKey, boolean>;

export const DEFAULT_SWITCHES: SwitchState = {
  general: true,
  appointments: true,
  orders: true,
  offers: true,
  medications: true,
  doctorMessages: true,
  emergency: true,
  sound: true,
  vibration: true,
};

export const DEVICE_SETTINGS_STORAGE_KEY = 'nabd.notification-device-settings';

type ServerSettings = { channels?: Record<string, unknown>; categories?: Record<string, unknown> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function isServerSwitch(key: string): key is ServerSwitchKey {
  return Object.prototype.hasOwnProperty.call(SERVER_SWITCHES, key);
}

export function isDeviceSwitch(key: string): key is DeviceSwitchKey {
  return (DEVICE_SWITCHES as readonly string[]).includes(key);
}

/** Server `{channels, categories}` (optionally under `data`) → the server-backed switches. */
export function serverToSwitches(payload: unknown): Partial<Record<ServerSwitchKey, boolean>> {
  const root = asRecord(payload);
  const source: ServerSettings = (asRecord(root?.data) ?? root ?? {}) as ServerSettings;
  const out: Partial<Record<ServerSwitchKey, boolean>> = {};
  for (const flat of Object.keys(SERVER_SWITCHES) as ServerSwitchKey[]) {
    const target = SERVER_SWITCHES[flat];
    const group = asRecord(source[target.group]);
    const value = group?.[target.key];
    if (typeof value === 'boolean') out[flat] = value;
  }
  return out;
}

/** One switch → the nested PATCH body the server validates. */
export function switchToServerPatch(key: ServerSwitchKey, value: boolean): Partial<Record<ServerGroup, Record<string, boolean>>> {
  const target = SERVER_SWITCHES[key];
  return { [target.group]: { [target.key]: value } };
}

/** Stored device-local switches (sound/vibration) → partial state; ignores anything else. */
export function parseDeviceSwitches(raw: string | null): Partial<Record<DeviceSwitchKey, boolean>> {
  if (!raw) return {};
  try {
    const parsed = asRecord(JSON.parse(raw));
    const out: Partial<Record<DeviceSwitchKey, boolean>> = {};
    for (const key of DEVICE_SWITCHES) if (typeof parsed?.[key] === 'boolean') out[key] = parsed[key] as boolean;
    return out;
  } catch {
    return {};
  }
}

export type ToggleDeps = {
  sendPatch: (body: Partial<Record<ServerGroup, Record<string, boolean>>>) => Promise<unknown>;
  saveDevice: (value: Partial<Record<DeviceSwitchKey, boolean>>) => Promise<void>;
};

export type ToggleResult = { settings: SwitchState; failed: boolean };

/**
 * Flip one switch and persist it where it belongs. On failure the previous
 * state is returned with `failed: true`, so the screen reverts the switch and
 * shows an error instead of pretending it saved. Emergency is locked.
 */
export async function persistToggle(prev: SwitchState, key: SwitchKey, deps: ToggleDeps): Promise<ToggleResult> {
  if (key === 'emergency') return { settings: prev, failed: false };
  const next: SwitchState = { ...prev, [key]: !prev[key] };
  try {
    if (isServerSwitch(key)) await deps.sendPatch(switchToServerPatch(key, next[key]));
    else await deps.saveDevice({ sound: next.sound, vibration: next.vibration });
    return { settings: next, failed: false };
  } catch {
    return { settings: prev, failed: true };
  }
}
