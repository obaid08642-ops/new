/**
 * 13.R8 — internal links only from real edges (mocked stores, no DB).
 * Proves dead/guessed links are dropped and renames emit canonical only.
 */
import {
  decideInternalLink,
  filterDeadInternalLinks,
  preferredSlug,
} from './internal-link-edge.util';

const liveStore = (liveIds: Set<string>, history: Record<string, string> = {}) => ({
  sourceExists: (type: string, id: string) => liveIds.has(`${type}:${id}`),
  historyNewSlug: (type: string, oldSlug: string) => {
    const v = history[`${type}:${oldSlug}`];
    return v || null;
  },
});

describe('13.R8 internal links only from real edges', () => {
  it('drops links whose target no longer exists (deleted without history)', () => {
    const store = liveStore(new Set(['medicine:m1']));
    const dead = decideInternalLink(
      { entity_type: 'medicine', entity_id: 'gone', slug: 'old-gone', indexable: true, sitemapIncluded: true },
      store,
    );
    expect(dead.emit).toBe(false);
    expect(dead.reason).toBe('missing_target');
  });

  it('drops non-indexable / non-included edges and unsupported namespaces (no guessed URLs)', () => {
    const store = liveStore(new Set(['medicine:m1', 'doctor:d1']));
    expect(
      decideInternalLink(
        { entity_type: 'medicine', entity_id: 'm1', slug: 's-m1', indexable: false, sitemapIncluded: true },
        store,
      ).emit,
    ).toBe(false);
    expect(
      decideInternalLink(
        { entity_type: 'medicine', entity_id: 'm1', slug: 's-m1', indexable: true, sitemapIncluded: false },
        store,
      ).emit,
    ).toBe(false);
    expect(
      decideInternalLink(
        { entity_type: 'guess-type', entity_id: 'm1', slug: 's-m1', indexable: true, sitemapIncluded: true },
        store,
      ).emit,
    ).toBe(false);
    expect(
      decideInternalLink(
        { entity_type: 'medicine', entity_id: 'm1', slug: '', indexable: true, sitemapIncluded: true },
        store,
      ).emit,
    ).toBe(false);
  });

  it('emits live edges and rewrites renames via history to the canonical slug', () => {
    const store = liveStore(new Set(['medicine:m1']), { 'medicine:old-slug': 'new-slug-m1' });
    const live = decideInternalLink(
      { entity_type: 'medicine', entity_id: 'm1', slug: 'new-slug-m1', indexable: true, sitemapIncluded: true },
      store,
    );
    expect(live.emit).toBe(true);
    expect(live.slugToUse).toBe('new-slug-m1');

    const renamed = decideInternalLink(
      { entity_type: 'medicine', entity_id: 'm1', slug: 'old-slug', indexable: true, sitemapIncluded: true },
      store,
    );
    expect(renamed.emit).toBe(true);
    expect(renamed.slugToUse).toBe('new-slug-m1');
    expect(renamed.reason).toBe('renamed_via_history');
  });

  it('filters a batch to real edges only and prefers stored canonical slugs', () => {
    const store = liveStore(new Set(['medicine:m1', 'doctor:d1']));
    const out = filterDeadInternalLinks(
      [
        { entity_type: 'medicine', entity_id: 'm1', slug: 'canon-m1', indexable: true, sitemapIncluded: true },
        { entity_type: 'medicine', entity_id: 'dead', slug: 'canon-dead', indexable: true, sitemapIncluded: true },
        { entity_type: 'doctor', entity_id: 'd1', slug: 'canon-d1', indexable: true, sitemapIncluded: true },
        { entity_type: 'doctor', entity_id: 'd1', slug: 'canon-d1', indexable: false, sitemapIncluded: true },
      ],
      store,
    );
    expect(out.map((l) => `${l.entity_type}:${l.entity_id}`)).toEqual(['medicine:m1', 'doctor:d1']);
    expect(preferredSlug('  canon-m1  ', 'Other Name', 'm1')).toBe('canon-m1');
    expect(preferredSlug('', 'Panadol Extra', 'a1b2c3d4')).toContain('a1b2c3');
  });
});
