import { HSTS_VALUE, SecurityHeadersMiddleware } from './security.module';

describe('API security headers (16.4)', () => {
  function run() {
    const headers: Record<string, string> = {};
    const res: any = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    const next = jest.fn();
    new SecurityHeadersMiddleware().use({} as any, res, next);
    return { headers, next };
  }

  it('sends HSTS for two years, every subdomain, preload-eligible', () => {
    const { headers } = run();
    expect(headers['Strict-Transport-Security']).toBe(HSTS_VALUE);
    expect(HSTS_VALUE).toMatch(/max-age=(\d+); includeSubDomains; preload/);
    // a preload submission needs at least one year
    expect(Number(/max-age=(\d+)/.exec(HSTS_VALUE)![1])).toBeGreaterThanOrEqual(31536000);
  });

  it('denies framing, sniffing, cross-origin window sharing and device features; keeps the referrer short', () => {
    const { headers, next } = run();
    expect(headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'X-Permitted-Cross-Domain-Policies': 'none',
    });
    expect(next).toHaveBeenCalled();
  });
});
