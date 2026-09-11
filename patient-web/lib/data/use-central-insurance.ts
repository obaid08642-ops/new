"use client";
import { useEffect, useState } from "react";
import { SAUDI_INSURANCE_COMPANIES, type InsuranceCompanyOption } from "./insurance-companies";

/**
 * Central insurance catalog: live DB first (same source the admin manages
 * and the apps read via /insurance/companies), static list as fallback.
 * Shape matches InsuranceCompanyOption so call sites stay unchanged.
 */
export function useCentralInsurance(): InsuranceCompanyOption[] {
  const [list, setList] = useState<InsuranceCompanyOption[]>(SAUDI_INSURANCE_COMPANIES);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
        const res = await fetch(`${base}/api/v1/catalogs/insurance`, { next: { revalidate: 21600 } } as any);
        if (!res.ok) return;
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        if (!arr.length) return;
        const mapped: InsuranceCompanyOption[] = arr.map((c: any) => ({
          id: String(c.code || c.id),
          code: String(c.code || c.id),
          nameAr: c.name_ar || c.nameAr || c.code,
          nameEn: c.name_en || c.nameEn || c.code,
          defaultCoPay: 0.2,
          maxCoPaySar: 50,
        }));
        if (!cancelled && mapped.length) setList(mapped);
      } catch { /* keep static fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);
  return list;
}
