import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

/**
 * The first-launch gate (owner decision 6, 2026-10-10): language and the intro show once, before Welcome. The flag is kept in
 * AsyncStorage under a versioned key. If storage fails, the gate never blocks the app: a failed read counts as "not done" (the
 * intro shows) and a failed write is remembered in memory, so the intro shows at most once per app session.
 */
let doneThisSession = false;

/** Has the intro been finished or skipped on this device (or earlier in this session)? */
export async function readIntroDone(): Promise<boolean> {
  if (doneThisSession) return true;
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.INTRO_DONE)) === 'true';
  } catch {
    return false;
  }
}

/** Record the intro as done: in memory first (so a storage failure cannot show it twice), then on the device. */
export async function markIntroDone(): Promise<void> {
  doneThisSession = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.INTRO_DONE, 'true');
  } catch {
    // storage failure is not worth stopping the user for
  }
}

/** For tests: forget the in-memory flag. */
export function resetIntroGateForTests(): void {
  doneThisSession = false;
}
