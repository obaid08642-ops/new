import { useState, useEffect } from 'react';
import client from './client';

/**
 * UNIFIED CATALOGS — single source of truth.
 * Insurance companies (with their plan tiers) and medical service catalogs are
 * served by the backend (insurance_companies / insurance_networks collections,
 * managed from the admin dashboard). Every app screen — provider onboarding,
 * provider dashboard, patient app — must read from here, never from a
 * hardcoded second list. The legacy constants are kept ONLY as an offline
 * fallback so a registration never dead-ends without connectivity.
 */

export interface CatalogCompany {
  id: string;          // company code (e.g. 'bupa')
  ar: string;
  en: string;
  logo?: string | null;
  plans: string[];     // tier names (الفئات) e.g. ['الأساسية','الذهبية']
  planDetails?: Array<{ id: string; code?: string; name_ar?: string; name_en?: string; tier_level?: number }>;
}

let insuranceCache: CatalogCompany[] | null = null;
let insuranceCacheAt = 0;

export async function getInsuranceCatalog(force = false): Promise<CatalogCompany[]> {
  // 5-minute in-memory cache — the catalog is admin-managed and rarely changes
  if (!force && insuranceCache && Date.now() - insuranceCacheAt < 5 * 60 * 1000) return insuranceCache;
  try {
    const res = await client.get('/insurance/companies');
    const list: CatalogCompany[] = (res.data || []).map((c: any) => ({
      id: c.code || c.id,
      ar: c.name_ar || c.name_en || c.code,
      en: c.name_en || c.name_ar || c.code,
      logo: c.logo || c.logo_url || null,
      plans: (c.plans || []).map((p: any) => p.name_ar || p.name_en || p.code).filter(Boolean),
      planDetails: c.plans || [],
    }));
    if (list.length) {
      insuranceCache = list;
      insuranceCacheAt = Date.now();
      return list;
    }
  } catch {
    // fall through to the offline constant
  }
  // Offline fallback only — the authoritative catalog is the backend.
  const { INSURANCE } = await import('../constants');
  const fallback = INSURANCE as readonly { id: string; ar: string; en: string; plans: readonly string[] }[];
  return fallback.map((c) => ({ id: c.id, ar: c.ar, en: c.en, plans: [...c.plans] }));
}

/** Clear the in-memory catalog cache (e.g. after the admin edits companies). */
export function invalidateCatalogs() {
  insuranceCache = null;
  insuranceCacheAt = 0;
}

/** React hook: the unified insurance catalog (companies + plan tiers). */
export function useInsuranceCatalog(): CatalogCompany[] {
  const [list, setList] = useState<CatalogCompany[]>([]);
  useEffect(() => {
    let alive = true;
    getInsuranceCatalog().then((l) => { if (alive) setList(l); });
    return () => { alive = false; };
  }, []);
  return list;
}

// ─── Medical services catalogs (labs / radiology / nursing) ─────────────────
// Same principle: the backend collections (labservices, radiologyservices,
// homecareservices — managed from the admin dashboard) are the single source.
// The local constants remain only as an offline fallback.

export interface CatalogService {
  id: string;
  ar: string;
  en: string;
  category?: string;
  price?: number;
  fasting?: boolean;
  fastH?: number;
  hours?: number;
  min?: number;
  prep?: boolean;
  noteAr?: string;
  is_package?: boolean;
}

type SvcType = 'lab' | 'radiology' | 'nursing';
const svcCache: Partial<Record<SvcType, { at: number; list: CatalogService[] }>> = {};

const SVC_ENDPOINT: Record<SvcType, string> = {
  lab: '/labs/services',
  radiology: '/radiology/services',
  nursing: '/nursing/catalog',
};

function mapSvc(raw: any): CatalogService {
  return {
    id: raw.id || raw.code || raw.short_code,
    ar: raw.name_ar || raw.ar || raw.name_en || raw.en || raw.id,
    en: raw.name_en || raw.en || raw.name_ar || raw.ar || raw.id,
    category: raw.category || raw.modality,
    price: raw.price,
    fasting: !!raw.fasting_required,
    fastH: raw.fasting_hours,
    hours: raw.turnaround_hours,
    min: raw.duration_minutes || raw.estimated_duration_minutes,
    prep: (raw.preparation_ar || []).length > 0 || !!raw.contrast_required,
    noteAr: (raw.preparation_ar || [])[0],
    is_package: !!raw.is_package,
  };
}

export async function getServicesCatalog(type: SvcType, force = false): Promise<CatalogService[]> {
  const hit = svcCache[type];
  if (!force && hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.list;
  try {
    const res = await client.get(SVC_ENDPOINT[type]);
    const raw = Array.isArray(res.data) ? res.data : (res.data?.services || res.data?.items || []);
    const list: CatalogService[] = raw.filter((s: any) => s && s.active !== false).map(mapSvc).filter((s) => s.id);
    if (list.length) {
      svcCache[type] = { at: Date.now(), list };
      return list;
    }
  } catch {
    // offline → constant fallback below
  }
  const C = await import('../constants');
  const fallback: any[] = type === 'lab' ? [...C.LAB_TESTS] : type === 'radiology' ? [...C.RAD_SCANS] : [...C.NURSING_SVCS];
  return fallback.map((s: any) => ({
    id: s.id, ar: s.ar, en: s.en,
    fasting: s.fasting, fastH: s.fastH, hours: s.hours, min: s.min, prep: s.prep, noteAr: s.noteAr,
  }));
}

/** React hook: unified services catalog for a provider type. */
export function useServicesCatalog(type: SvcType): CatalogService[] {
  const [list, setList] = useState<CatalogService[]>([]);
  useEffect(() => {
    let alive = true;
    getServicesCatalog(type).then((l) => { if (alive) setList(l); });
    return () => { alive = false; };
  }, [type]);
  return list;
}
