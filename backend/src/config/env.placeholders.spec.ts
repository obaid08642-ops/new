import { stripPlaceholderSecrets } from './env.validation';

describe('stripPlaceholderSecrets', () => {
  it('drops deploy.sh placeholders so gateways read as not configured', () => {
    const env: NodeJS.ProcessEnv = { MOYASAR_API_KEY: 'pending_real_key', MOYASAR_SECRET: 'pending_real_key', RESEND_API_KEY: '__RESEND_API_KEY__', JWT_SECRET: 'a'.repeat(48), DB_NAME: 'pending', S3_SECRET_ACCESS_KEY: 'changeme' };
    expect(stripPlaceholderSecrets(env).sort()).toEqual(['MOYASAR_API_KEY', 'MOYASAR_SECRET', 'RESEND_API_KEY', 'S3_SECRET_ACCESS_KEY']);
    expect(env.MOYASAR_API_KEY).toBeUndefined();
    expect(env.JWT_SECRET).toHaveLength(48);
    expect(env.DB_NAME).toBe('pending'); // not a secret name: untouched
  });
  it('keeps real keys', () => {
    const env: NodeJS.ProcessEnv = { MOYASAR_API_KEY: 'sk_live_abc123', TAP_API_KEY: 'pending-approval-2026-key-xyz' };
    expect(stripPlaceholderSecrets(env)).toEqual([]);
  });
});
