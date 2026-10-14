/**
 * Where the splash sends the user. The owner's launch rule (DESIGN_HANDOFF_FINAL, product decisions; owner decision 6,
 * 2026-10-10): the first launch shows the language step, then the intro slides, then Welcome, once. After that the first
 * visit to Welcome is the end of "first launch": every later launch opens Home as a guest, and a login is asked for only at
 * checkout or booking. "First launch" is a device that has no stored session, has never shown Welcome (Welcome writes
 * ONBOARDING_DONE when it opens) and has not finished the intro. A device with a session (patient or guest) always opens Home,
 * so an existing install that updates to this version never sees the intro.
 */
export type LaunchRoute = '/(tabs)' | '/(auth)/welcome' | '/(onboarding)/language';

export interface LaunchState {
  /** An access token is in secure storage (a patient or a device-bound guest). */
  hasSession: boolean;
  /** Welcome has been shown on this device before. */
  welcomeSeen: boolean;
  /** The language step and the intro were finished or skipped (src/utils/onboardingGate). */
  introDone: boolean;
}

export function launchRoute({ hasSession, welcomeSeen, introDone }: LaunchState): LaunchRoute {
  if (hasSession || welcomeSeen) return '/(tabs)';
  return introDone ? '/(auth)/welcome' : '/(onboarding)/language';
}

/**
 * The silent guest session (owner decision B2) is for a launch that goes to Home with no session. On the first
 * launch the user chooses on Welcome (the guest button opens the same session), so none is created behind it.
 */
export function needsSilentGuest(state: LaunchState): boolean {
  return launchRoute(state) === '/(tabs)' && !state.hasSession;
}
