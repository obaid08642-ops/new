import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ---------------------------------------------------------------------------
// Stable per-device identity used for GUEST accounts.
// The backend binds `guest_device:<deviceId>` → the SAME guest account, so a
// guest's orders / bookings / history survive app restarts and are merged into
// their real account when they eventually register.
// ---------------------------------------------------------------------------

const KEY = '@nabdah_device_id';
let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch { /* storage read failed — fall through to regenerate */ }

  let id: string;
  try {
    id = Crypto.randomUUID();
  } catch {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  try { await AsyncStorage.setItem(KEY, id); } catch { /* best-effort */ }
  cached = id;
  return id;
}
