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

type RawInsurancePlan = { id?: string; code?: string; name_ar?: string; name_en?: string; tier_level?: number };
type RawInsuranceCompany = { id?: string; code?: string; name_ar?: string; name_en?: string; logo?: string | null; logo_url?: string | null; plans?: RawInsurancePlan[] };

/**
 * Q51: the catalog request itself. Throws on a network/server failure so a
 * screen can tell "could not load" apart from "the catalog is empty".
 */
export async function fetchInsuranceCatalog(force = false): Promise<CatalogCompany[]> {
  // 5-minute in-memory cache — the catalog is admin-managed and rarely changes
  if (!force && insuranceCache && Date.now() - insuranceCacheAt < 5 * 60 * 1000) return insuranceCache;
  const res = await client.get('/insurance/companies');
  const raw: RawInsuranceCompany[] = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
  const list: CatalogCompany[] = (raw || []).map((c) => ({
    id: c.code || c.id || '',
    ar: c.name_ar || c.name_en || c.code || '',
    en: c.name_en || c.name_ar || c.code || '',
    logo: c.logo || c.logo_url || null,
    plans: (c.plans || []).map((p) => p.name_ar || p.name_en || p.code || '').filter(Boolean),
    planDetails: (c.plans || []).map((p) => ({ ...p, id: p.id || p.code || '' })),
  }));
  if (list.length) {
    insuranceCache = list;
    insuranceCacheAt = Date.now();
  }
  return list;
}

export async function getInsuranceCatalog(force = false): Promise<CatalogCompany[]> {
  try {
    return await fetchInsuranceCatalog(force);
  } catch {
    return [];
  }
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

export type CatalogLoadStatus = 'loading' | 'ready' | 'error';

/** Q51: the insurance catalog with its load state, for screens that must show loading / error / empty. */
export function useInsuranceCatalogState(): { status: CatalogLoadStatus; companies: CatalogCompany[]; reload: () => void } {
  const [companies, setCompanies] = useState<CatalogCompany[]>([]);
  const [status, setStatus] = useState<CatalogLoadStatus>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    fetchInsuranceCatalog(attempt > 0)
      .then((list) => { if (alive) { setCompanies(list); setStatus('ready'); } })
      .catch(() => { if (alive) { setCompanies([]); setStatus('error'); } });
    return () => { alive = false; };
  }, [attempt]);
  return { status, companies, reload: () => setAttempt((n) => n + 1) };
}

// ─── Medical services catalogs (labs / radiology / nursing) ─────────────────
// The backend collections (labservices, radiologyservices, and
// homecareservices) are the single source of truth for these records.

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
    const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (res.data?.services || res.data?.items || []));
    const list: CatalogService[] = raw.filter((s: any) => s && s.active !== false).map(mapSvc).filter((s) => s.id);
    if (list.length) {
      svcCache[type] = { at: Date.now(), list };
      return list;
    }
  } catch {
    return [];
  }
  return [];
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

// ─── Specialties (F22) ───────────────────────────────────────────────────────
// Canonical `specialties` collection via /catalogs/specialties (admin-managed).
export interface SpecialtyEntry { id: string; ar: string; en: string; icon?: string }

let specialtiesCache: { at: number; list: SpecialtyEntry[] } | null = null;

export async function getSpecialtiesCatalog(force = false): Promise<SpecialtyEntry[]> {
  if (!force && specialtiesCache && Date.now() - specialtiesCache.at < 5 * 60 * 1000) return specialtiesCache.list;
  try {
    const res = await client.get('/catalogs/specialties');
    const raw = Array.isArray(res.data) ? res.data : [];
    const list: SpecialtyEntry[] = raw
      .map((x: any) => ({ id: String(x.code || x.id || ''), ar: x.name_ar || x.name_en || '', en: x.name_en || x.name_ar || '', icon: typeof x.icon === 'string' ? x.icon : undefined }))
      .filter((s) => s.id && s.ar);
    if (list.length) {
      specialtiesCache = { at: Date.now(), list };
      return list;
    }
  } catch {
    return [];
  }
  return [];
}

/** React hook: specialties from the backend catalog. */
export function useSpecialtiesCatalog(): SpecialtyEntry[] {
  const [list, setList] = useState<SpecialtyEntry[]>([]);
  useEffect(() => {
    let alive = true;
    getSpecialtiesCatalog().then((l) => { if (alive) setList(l); });
    return () => { alive = false; };
  }, []);
  return list;
}
