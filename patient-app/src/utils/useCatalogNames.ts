import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from './api';
import { normalizeLabService, recordOf } from './labMappers';

export type CatalogGroup = 'labs' | 'radiology' | 'nursing';

/** The public catalogue endpoint that names an item of each group (the same reads as the test and nursing pages). */
export const catalogPath = (group: CatalogGroup, id: string): string => {
  const safe = encodeURIComponent(id);
  return group === 'labs' ? `/labs/services/${safe}` : group === 'radiology' ? `/radiology/services/${safe}` : `/home-care/services/${safe}`;
};

const MAX_LOOKUPS = 40;

/**
 * Names of the catalogue ids of a medical order (the order carries ids only). A lookup that fails is left out, so the screen falls back to
 * the group name; nothing is invented. Returns a map catalogue id -> name.
 */
export function useCatalogNames(items: Array<{ group: CatalogGroup; catalog_id: string }>): Record<string, string> {
  const wanted = useMemo(() => {
    const seen = new Map<string, CatalogGroup>();
    for (const i of items) if (!seen.has(i.catalog_id)) seen.set(i.catalog_id, i.group);
    return [...seen.entries()].slice(0, MAX_LOOKUPS);
  }, [items]);
  const key = wanted.map(([id, g]) => `${g}:${id}`).join(',');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    void Promise.allSettled(wanted.map(async ([id, group]) => {
      const item = normalizeLabService(recordOf(await apiFetch<unknown>(catalogPath(group, id))));
      return [id, item?.name ?? ''] as const;
    })).then((results) => {
      if (!live) return;
      const out: Record<string, string> = {};
      for (const r of results) if (r.status === 'fulfilled' && r.value[1]) out[r.value[0]] = r.value[1];
      setNames(out);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return names;
}
