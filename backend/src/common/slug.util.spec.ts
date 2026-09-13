import { slugify, buildSlug, parseSlugSuffix, escapeRegex } from './slug.util';

describe('slug.util', () => {
  describe('escapeRegex', () => {
    it('escapes special regex characters correctly', () => {
      const malicious = '[.*+?^${}()|[\\]\\]';
      const escaped = escapeRegex(malicious);
      expect(() => new RegExp(escaped)).not.toThrow();
      expect(escaped).toBe('\\[\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\\\\\]\\\\\\]');
    });

    it('returns empty string for empty input', () => {
      expect(escapeRegex('')).toBe('');
      expect(escapeRegex(null as any)).toBe('');
      expect(escapeRegex(undefined as any)).toBe('');
    });

    it('leaves alphanumeric characters unchanged', () => {
      expect(escapeRegex('panadol 500mg')).toBe('panadol 500mg');
      expect(escapeRegex('بنادول')).toBe('بنادول');
    });
  });

  describe('slugify & buildSlug', () => {
    it('generates deterministic slugs with id suffix', () => {
      const slug = buildSlug('Panadol Extra', 'a1b2c3d4');
      expect(slug).toBe('panadol-extra-a1b2c3');
      expect(parseSlugSuffix(slug)).toBe('a1b2c3');
    });
  });
});
