/**
 * The call this device is in right now (set by the call screen while it holds a room). A second incoming call while one is active is
 * answered "busy" instead of starting a second room next to the first.
 */
let active: string | null = null;

export function setActiveCall(sessionId: string | null): void {
  active = sessionId;
}

export function getActiveCall(): string | null {
  return active;
}

/** True when a different call is already running. */
export function isBusyFor(sessionId: string | undefined | null): boolean {
  return active !== null && active !== sessionId;
}
