"use client";
import { useEffect, useState } from "react";

export type InsuranceCompanyOption = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  image_url?: string;
  plans?: Array<{ id?: string; code?: string; name_ar?: string; name_en?: string; tier_level?: number }>;
};

export type InsuranceCatalogState = {
  companies: InsuranceCompanyOption[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Q50: the ONLY source is the admin-managed catalog (GET /catalogs/insurance).
 * There is no static list and no invented co-pay: coverage numbers come only
 * from the coverage rules / coverage-check on the server. On failure the
 * callers show an error state, never a fake list.
 */
export function useCentralInsurance(): InsuranceCatalogState {
  const [companies, setCompanies] = useState<InsuranceCompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
        const res = await fetch(`${base}/api/v1/catalogs/insurance`);
        if (!res.ok) throw new Error(`catalog_unavailable_${res.status}`);
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
        const mapped: InsuranceCompanyOption[] = arr.map((c: any) => ({
          id: String(c.code || c.id),
          code: String(c.code || c.id),
          nameAr: c.name_ar || c.nameAr || c.code,
          nameEn: c.name_en || c.nameEn || c.code,
          image_url: c.image_url || c.logo_url,
          plans: Array.isArray(c.plans) ? c.plans : [],
        }));
        if (!cancelled) {
          setCompanies(mapped);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "catalog_unavailable");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  return { companies, loading, error, reload: () => setNonce(n => n + 1) };
}
