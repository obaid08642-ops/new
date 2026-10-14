/**
 * One stable device id per browser. The backend binds (and reuses) one guest account per device id
 * (AuthService.guest), so every guest button and the Google callback must send the SAME id; a fresh id per
 * click would open a new guest user and patient profile on every press.
 */
export const DEVICE_ID_STORAGE_KEY = "nabd_device_id";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Reads the stored id, or creates and stores one. Storage may be blocked (private window): the id then lasts for the page only. */
export function getStableDeviceId(storage?: Storage | null): string {
  let store: Storage | null = null;
  try { store = storage === undefined ? window.localStorage : storage; } catch { store = null; }
  try {
    const existing = store?.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && existing.length >= 8 && existing.length <= 128) return existing;
  } catch { /* fall through to a new id */ }
  const created = newId();
  try { store?.setItem(DEVICE_ID_STORAGE_KEY, created); } catch { /* not persisted: the id is still usable for this request */ }
  return created;
}
