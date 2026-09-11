import { useEffect, useState } from 'react';
import client from './client';
import { LAB_TESTS, RAD_SCANS } from '../constants';

export type CatalogEntry = { id: string; ar: string; en: string; fasting?: boolean; hours?: number };

/**
 * Central catalog (labs + radiology) from backend /catalogs/* — the same live
 * DB the admin manages. Falls back to the baked-in constants when offline.
 */
let cache: Record<string, CatalogEntry> | null = null;

export async function fetchCentralCatalog(): Promise<Record<string, CatalogEntry>> {
  if (cache) return cache;
  const map: Record<string, CatalogEntry> = {};
  try {
    const [labs, radio]: any[] = await Promise.all([
      client.get('/catalogs/labs').then((r: any) => r.data).catch(() => []),
      client.get('/catalogs/radiology').then((r: any) => r.data).catch(() => []),
    ]);
    for (const x of [...(Array.isArray(labs) ? labs : []), ...(Array.isArray(radio) ? radio : [])]) {
      const id = String(x.short_code || x.code || x.id || '').toLowerCase();
      if (!id) continue;
      map[id] = {
        id,
        ar: x.name_ar || x.name || id,
        en: x.name_en || x.name || id,
        fasting: Boolean(x.fasting_required),
        hours: Number(x.turnaround_hours || 0),
      };
    }
  } catch { /* fallback below */ }
  for (const t of [...LAB_TESTS, ...RAD_SCANS] as any[]) {
    const id = String(t.id || '').toLowerCase();
    if (id && !map[id]) map[id] = { id, ar: t.ar, en: t.en, fasting: t.fasting, hours: t.hours };
  }
  cache = map;
  return map;
}

export function useCentralCatalog() {
  const [map, setMap] = useState<Record<string, CatalogEntry>>({});
  useEffect(() => { fetchCentralCatalog().then(setMap).catch(() => {}); }, []);
  return map;
}
