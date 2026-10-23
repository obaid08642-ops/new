/**
 * Ord01 (app): the first-ask of the ordering context. A new patient with nothing saved (no address, no insurance, no family
 * member) is asked once, in a bottom sheet, and can skip; the skip is remembered on the device (AsyncStorage, not the backend).
 * A failed storage read counts as "not skipped" but the skip is also kept in memory so the sheet shows at most once per session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../constants';
import type { ProfileContext } from './orderingContext';

let skippedThisSession = false;

/** True when the profile has nothing the context could use: the one case in which the first-ask sheet is offered. */
export function isNewPatient(profile: ProfileContext | null): boolean {
  return !!profile && profile.addresses.length === 0 && profile.policy === null && profile.members.length === 0;
}

export async function readContextSkipped(): Promise<boolean> {
  if (skippedThisSession) return true;
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.ORDERING_CTX_SKIPPED)) === 'true';
  } catch {
    return false;
  }
}

export async function markContextSkipped(): Promise<void> {
  skippedThisSession = true;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ORDERING_CTX_SKIPPED, 'true');
  } catch {
    // storage failure is not worth stopping the patient for
  }
}

/** Test hook: forget the in-memory skip. */
export function resetContextSkippedForTests(): void {
  skippedThisSession = false;
}
