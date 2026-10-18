import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { secureDelete } from './security';
import { getDeviceId } from './deviceId';

/**
 * 21.1 - a reinstall is a new guest.
 *
 * The device id lives in AsyncStorage, which goes away with the app. The session tokens live in SecureStore, which on iOS is the
 * Keychain and SURVIVES an uninstall: a reinstalled app would reopen the previous install's session (and its guest) instead of
 * making a new one. The two are checked against each other once per launch: no device id means this is a fresh install, so
 * whatever session the Keychain still holds belongs to a previous install and is removed before anything reads it.
 *
 * Reading the id fails open: if AsyncStorage cannot be read, nobody is signed out.
 */
const DEVICE_ID_KEY = '@nabdah_device_id';
const SESSION_KEYS = [STORAGE_KEYS.AUTH_TOKEN, 'userToken', STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA];

let checked: Promise<void> | null = null;

export function ensureInstallChecked(): Promise<void> {
  if (!checked) {
    checked = (async () => {
      let fresh = false;
      try {
        fresh = !(await AsyncStorage.getItem(DEVICE_ID_KEY));
      } catch {
        return;
      }
      if (!fresh) return;
      for (const key of SESSION_KEYS) {
        try { await secureDelete(key); } catch { /* best-effort: a failed delete leaves the old session, never a new failure */ }
      }
      await getDeviceId().catch(() => undefined);      // the new install gets its id now, so the next launch is not "fresh" again
    })();
  }
  return checked;
}

/** Tests only: forget that this launch was checked. */
export function resetInstallCheckForTests(): void {
  checked = null;
}
