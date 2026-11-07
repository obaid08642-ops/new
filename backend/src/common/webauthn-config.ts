/**
 * Single source of truth for WebAuthn relying-party settings, shared by passkey
 * enrollment/login (PasskeyService) and step-up re-authentication (StepUpService).
 *
 * Two copies of this logic used to disagree: PasskeyService used rpID 'nabd.plus'
 * and origin https://admin.nabd.plus, while StepUpService derived the rpID from
 * PASSKEY_ORIGIN/APP_ORIGIN (default http://localhost:3001) and accepted a single
 * origin. A credential registered for rpID nabd.plus then failed every step-up
 * assertion. Both services now read this module.
 */
export const DEFAULT_RP_ID = 'nabd.plus';
export const DEFAULT_ORIGINS = ['https://admin.nabd.plus', 'https://nabd.plus'];

export function webauthnRpId(env: NodeJS.ProcessEnv = process.env): string {
  // PASSKEY_RP_ID is the legacy name once used by the step-up guard.
  return (env.WEBAUTHN_RP_ID || env.PASSKEY_RP_ID || DEFAULT_RP_ID).trim();
}

export function webauthnOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.WEBAUTHN_ORIGIN || env.PASSKEY_ORIGIN;
  const list = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  return list.length ? list : [...DEFAULT_ORIGINS];
}
