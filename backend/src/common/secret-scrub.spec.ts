import { scrubDeep, scrubSecrets } from './secret-scrub';
import { providerHttpErrorCode } from '../modules/ai/ai-gateway.service';

describe('secret scrubbing', () => {
  it('maps a provider 401/403 to a code without any body', () => {
    expect(providerHttpErrorCode('replicate', 401)).toBe('ai_provider_auth_failed');
    expect(providerHttpErrorCode('gemini', 403)).toBe('ai_provider_auth_failed');
    expect(providerHttpErrorCode('openai', 500)).toBe('openai_http_500');
  });
  it('redacts keys, bearer tokens, JWTs and key=value pairs', () => {
    const k = 'r8_AbCdEfGh1234567890';
    expect(scrubSecrets(`Bearer ${k} failed`)).not.toContain('AbCdEfGh');
    expect(scrubSecrets(`token ${k}`)).not.toContain('AbCdEfGh');
    expect(scrubSecrets('api_key=abcd1234efgh')).toBe('api_key=[redacted]');
    expect(scrubSecrets('{"authorization": "abcdef12"}')).not.toContain('abcdef12');
    expect(scrubSecrets('eyJhbGciOiJI.eyJzdWIiOiIx.SflKxwRJ')).toBe('[redacted]');
  });
  it('leaves ordinary text alone', () => {
    expect(scrubSecrets('replicate_http_500 on /api/v1/ai/prescription-ocr')).toBe('replicate_http_500 on /api/v1/ai/prescription-ocr');
  });
  it('scrubs nested event payloads, cycles included', () => {
    const ev: Record<string, unknown> = { message: 'Bearer abcdefgh12345', extra: { a: ['api_key=zzzz9999'] } };
    ev.self = ev;
    const out = scrubDeep(ev) as { message: string; extra: { a: string[] } };
    expect(out.message).toBe('[redacted]');
    expect(out.extra.a[0]).toBe('api_key=[redacted]');
  });
});
