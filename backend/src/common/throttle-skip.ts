/**
 * The local live stack (tools/live/start-backend.sh) drives many logins and
 * OTPs from one IP and sets DISABLE_RATE_LIMIT=true, which ApiSecurityService
 * already honours; the Nest throttler (incl. per-route @Throttle) honours it
 * too, but never in production.
 */
export function shouldSkipThrottle(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DISABLE_RATE_LIMIT === 'true' && env.NODE_ENV !== 'production';
}
