export function validateEnvironment(env: Record<string, unknown>) {
  const nodeEnv = String(env.NODE_ENV || 'development');
  if (nodeEnv !== 'production') return env;

  const required = ['MONGO_URL', 'REDIS_URL', 'JWT_SECRET', 'ALLOWED_ORIGINS'];
  const missing = required.filter((name) => typeof env[name] !== 'string' || !String(env[name]).trim());
  if (missing.length) throw new Error(`FATAL: missing required production environment variables: ${missing.join(', ')}`);
  if (String(env.JWT_SECRET).length < 32) throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
  if (String(env.ALLOWED_ORIGINS).split(',').map((value) => value.trim()).includes('*')) {
    throw new Error('FATAL: ALLOWED_ORIGINS must not contain wildcard origin in production');
  }
  return env;
}

/**
 * deploy.sh fills unset third-party keys with placeholders (e.g. MOYASAR_API_KEY=pending_real_key)
 * and .env.production.example ships `__NAME__` markers. Code checks `if (process.env.X)`, so a
 * placeholder looks configured: payments would call Moyasar with a bogus key instead of answering
 * 503 payment_gateway_not_configured. Treat them as unset.
 */
const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|DSN)/;
const PLACEHOLDER_VALUE = /^(pending([_-]?real)?([_-]?key)?|changeme|change[_-]me|placeholder|todo|xxx+|__[A-Z0-9_]+__|your[_-][\w-]*)$/i;
export function stripPlaceholderSecrets(env: NodeJS.ProcessEnv = process.env): string[] {
  const stripped = Object.keys(env).filter((name) => SECRET_NAME.test(name) && PLACEHOLDER_VALUE.test(String(env[name] ?? '').trim()));
  for (const name of stripped) delete env[name];
  return stripped;
}
