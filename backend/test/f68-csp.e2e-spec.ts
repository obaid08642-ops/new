/**
 * F68 — Content-Security-Policy.
 *
 * The web clients sent no CSP at all and the backend sent one whose script-src
 * allowed 'unsafe-inline', so an injected <script> executed: the policy existed
 * on paper and did nothing. These assertions pin the properties that make a CSP
 * meaningful, so a future "temporary" inline allowance cannot come back unnoticed.
 */
import { contentSecurityPolicy, newCspNonce } from '../src/common/security-headers';

const directive = (policy: string, name: string): string => {
  const found = policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  if (!found) throw new Error(`missing directive: ${name}`);
  return found;
};

describe('F68 — backend Content-Security-Policy', () => {
  it('never allows unsafe-inline for scripts in production', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc', isProduction: true });
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('never allows unsafe-eval in production', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc', isProduction: true });
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-eval'");
  });

  it('locks the policy down with strict-dynamic when a nonce is present', () => {
    const policy = contentSecurityPolicy({ nonce: 'abc', isProduction: true });
    expect(directive(policy, 'script-src')).toContain("'strict-dynamic'");
    expect(directive(policy, 'script-src')).toContain("'nonce-abc'");
  });

  it('keeps the dev-only inline allowance out of production builds', () => {
    const dev = contentSecurityPolicy({ isProduction: false });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
  });

  it('denies plugins, framing and base-tag hijacking', () => {
    const policy = contentSecurityPolicy({ isProduction: true });
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(policy, 'form-action')).toBe("form-action 'self'");
  });

  it('allows the payment providers it must frame and nothing else', () => {
    const policy = contentSecurityPolicy({ isProduction: true });
    const frame = directive(policy, 'frame-src');
    expect(frame).toContain('https://api.moyasar.com');
    expect(frame).not.toContain('*');
  });

  it('adds upgrade-insecure-requests only in production', () => {
    expect(contentSecurityPolicy({ isProduction: true })).toContain('upgrade-insecure-requests');
    expect(contentSecurityPolicy({ isProduction: false })).not.toContain('upgrade-insecure-requests');
  });

  it('issues a fresh nonce per call, never a reusable one', () => {
    const a = newCspNonce();
    const b = newCspNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(22);
  });
});
