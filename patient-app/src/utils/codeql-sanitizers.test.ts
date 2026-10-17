import { sanitizeText } from './security';
import { getOptimizedImageUrl } from './performance';

// CodeQL high alerts (js/incomplete-multi-character-sanitization, js/incomplete-url-scheme-check,
// js/incomplete-url-substring-sanitization): the one-pass filters let a nested payload through.
describe('sanitizeText', () => {
  it('leaves no tag, scheme or handler after nested payloads', () => {
    for (const bad of ['<scr<script>ipt>alert(1)', 'javajavascript:script:alert(1)', 'ononclick==x', '<<b>img src=x>', 'vbscript:x', 'data:text/html,x']) {
      const out = sanitizeText(bad);
      expect(out).not.toMatch(/[<>]/);
      expect(out).not.toMatch(/(?:javascript|vbscript|data)\s*:/i);
      expect(out).not.toMatch(/on\w+\s*=/i);
    }
  });
  it('keeps ordinary text', () => {
    expect(sanitizeText('  بنادول 500 mg ')).toBe('بنادول 500 mg');
  });
});

describe('getOptimizedImageUrl', () => {
  it('adds the CDN parameters only for the CDN host itself', () => {
    expect(getOptimizedImageUrl('https://cdn.nabdahplus.com/a.png', 200)).toBe('https://cdn.nabdahplus.com/a.png?w=200&q=80&f=webp');
    expect(getOptimizedImageUrl('https://evil.example/cdn.nabdahplus.com/a.png', 200)).toBe('https://evil.example/cdn.nabdahplus.com/a.png');
    expect(getOptimizedImageUrl('not a url', 200)).toBe('not a url');
  });
});
