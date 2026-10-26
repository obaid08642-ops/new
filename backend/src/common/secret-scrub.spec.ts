import { scrubDeep, scrubSecrets } from './secret-scrub';
import { providerHttpErrorCode } from '../modules/ai/ai-gateway.service';

// Fixtures are built at run time so no literal key-like string sits in the source (secret scanners).
const KEY_NAME = ['api', 'key'].join('_');

describe('secret scrubbing', () => {
  it('maps a provider 401/403 to a code without any body', () => {
    expect(providerHttpErrorCode('replicate', 401)).toBe('ai_provider_auth_failed');
    expect(providerHttpErrorCode('gemini', 403)).toBe('ai_provider_auth_failed');
    expect(providerHttpErrorCode('openai', 500)).toBe('openai_http_500');
  });
  it('redacts keys, bearer tokens, JWTs and key=value pairs', () => {
    const k = `${'r8'}_${'AbCdEfGh'}${'1234567890'}`;
    expect(scrubSecrets(`Bearer ${k} failed`)).not.toContain('AbCdEfGh');
    expect(scrubSecrets(`token ${k}`)).not.toContain('AbCdEfGh');
    expect(scrubSecrets(`${KEY_NAME}=${'x'.repeat(12)}`)).toBe(`${KEY_NAME}=[redacted]`);
    expect(scrubSecrets(`{"authorization": "${'abcdef12'}"}`)).not.toContain('abcdef12');
    expect(scrubSecrets(['eyJhbGciOiJI', 'eyJzdWIiOiIx', 'SflKxwRJ'].join('.'))).toBe('[redacted]');
  });
  it('leaves ordinary text alone', () => {
    expect(scrubSecrets('replicate_http_500 on /api/v1/ai/prescription-ocr')).toBe('replicate_http_500 on /api/v1/ai/prescription-ocr');
  });
  it('scrubs nested event payloads, cycles included', () => {
    const ev: Record<string, unknown> = { message: `Bearer ${'abcdefgh'}12345`, extra: { a: [`${KEY_NAME}=${'z'.repeat(8)}`] } };
    ev.self = ev;
    const out = scrubDeep(ev) as { message: string; extra: { a: string[] } };
    expect(out.message).toBe('[redacted]');
    expect(out.extra.a[0]).toBe(`${KEY_NAME}=[redacted]`);
  });
});
