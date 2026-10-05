/**
 * Where the splash sends the user. The owner's launch rule (DESIGN_HANDOFF_FINAL, product decisions): the first
 * launch shows Welcome; every later launch opens Home as a guest, and a login is asked for only at checkout or
 * booking. "First launch" is a device that has no stored session and has never shown Welcome (Welcome writes
 * ONBOARDING_DONE when it opens). A device with a session (patient or guest) always opens Home.
 */
export type LaunchRoute = '/(tabs)' | '/(auth)/welcome';

export interface LaunchState {
  /** An access token is in secure storage (a patient or a device-bound guest). */
  hasSession: boolean;
  /** Welcome has been shown on this device before. */
  welcomeSeen: boolean;
}

export function launchRoute({ hasSession, welcomeSeen }: LaunchState): LaunchRoute {
  return hasSession || welcomeSeen ? '/(tabs)' : '/(auth)/welcome';
}

/**
 * The silent guest session (owner decision B2) is for a launch that goes to Home with no session. On the first
 * launch the user chooses on Welcome (the guest button opens the same session), so none is created behind it.
 */
export function needsSilentGuest(state: LaunchState): boolean {
  return launchRoute(state) === '/(tabs)' && !state.hasSession;
}
