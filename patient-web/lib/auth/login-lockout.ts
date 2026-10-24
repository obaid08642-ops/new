/** The app's sign-in lockout: five failed tries lock the form for five minutes (kept on this browser). */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 5 * 60 * 1000;
const KEY = "nabd_login_lock";

export type LockState = { fails: number; lockedUntil: number };

export function afterFailure(state: LockState, now: number): LockState {
  const fails = state.lockedUntil > now ? state.fails : state.fails + 1;
  return fails >= MAX_FAILED_LOGINS ? { fails: 0, lockedUntil: now + LOCK_MS } : { fails, lockedUntil: state.lockedUntil > now ? state.lockedUntil : 0 };
}

/** Whole minutes left of a lock (at least 1), or 0 when not locked. */
export function minutesLeft(state: LockState, now: number): number {
  return state.lockedUntil > now ? Math.max(1, Math.ceil((state.lockedUntil - now) / 60000)) : 0;
}

export function readLock(): LockState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null") as Partial<LockState> | null;
    if (parsed && Number.isFinite(parsed.fails) && Number.isFinite(parsed.lockedUntil)) return { fails: Number(parsed.fails), lockedUntil: Number(parsed.lockedUntil) };
  } catch { /* private mode: no lockout memory */ }
  return { fails: 0, lockedUntil: 0 };
}

export function writeLock(state: LockState): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}
