// 094122c review (CodeQL js/polynomial-redos): the e-mail pattern in stripPii
// retried from every position inside a long run of e-mail characters, so a 50k
// '%' prompt blocked the event loop for ~2.7 s (measured), quadratic in length.
import { stripPii, hashKey } from './ai-gateway.service';

describe('stripPii stays linear on hostile input', () => {
  it('200k e-mail characters with no @ are processed quickly', () => {
    const t = Date.now();
    stripPii('%'.repeat(200_000));
    expect(Date.now() - t).toBeLessThan(300);
  });
  it('still redacts e-mails, including one right after other text', () => {
    expect(stripPii('contact: a.b+c@nabd.test now')).toContain('[redacted-email]');
    expect(stripPii('x%%a@b.co')).not.toContain('a@b.co');
  });
  it('hashKey accepts only text (no array-like length tricks)', () => {
    expect(hashKey('abc')).toBe(hashKey(String('abc')));
  });
});
