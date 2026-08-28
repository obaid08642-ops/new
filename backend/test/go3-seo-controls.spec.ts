/**
 * GO-gate item 3 — seo_controls wiring (pure helpers).
 */
import {
  controlsMap, isTypeIndexable, robotsDisallowLines, ENTITY_ROUTE_KEYS,
} from '../src/modules/seo/seo-controls.util';

describe('seo publishing controls', () => {
  it('fail-open: missing control ⇒ indexable', () => {
    const m = controlsMap([]);
    expect(isTypeIndexable('medicine', m)).toBe(true);
    expect(robotsDisallowLines(m)).toEqual([]);
  });

  it('indexable=false blocks the type in sitemap AND emits a robots Disallow for its /s/ prefix', () => {
    const m = controlsMap([
      { route_key: 'medicine-catalog', indexable: false },
      { route_key: 'articles', indexable: true },
    ]);
    expect(isTypeIndexable('medicine', m)).toBe(false);
    expect(isTypeIndexable('article', m)).toBe(true);
    expect(isTypeIndexable('doctor', m)).toBe(true); // untouched
    const lines = robotsDisallowLines(m);
    expect(lines).toContain('Disallow: /s/medicine/');
    expect(lines).not.toContain('Disallow: /s/article/');
  });

  it('route_key mapping covers every entity type exactly once', () => {
    const keys = Object.values(ENTITY_ROUTE_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(['articles', 'doctors', 'facilities', 'home-care', 'lab-services', 'medicine-catalog'].sort());
  });
});
