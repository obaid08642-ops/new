import { asRecord, listOf } from "@/lib/insurance/view";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Issue 1550: what a guest sees on a service landing page, parsed for display only. Every name and price is the server's; a
 * row without an id or a name is dropped, nothing is filled in.
 */
const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export type PublicInsurer = { id: string; nameAr?: string; nameEn?: string; plans: Array<{ id: string; nameAr?: string; nameEn?: string }> };

/** GET /insurance/companies: `[{ id, code, name_ar, name_en, plans: [{ id, code, name_ar, name_en, tier_level }] }]`. */
export function parsePublicInsurers(payload: unknown): PublicInsurer[] {
  return listOf(payload).flatMap((row) => {
    const id = text(row.id) ?? text(row.code);
    const nameAr = text(row.name_ar);
    const nameEn = text(row.name_en);
    if (!id || (!nameAr && !nameEn)) return [];
    const plans = (Array.isArray(row.plans) ? row.plans : []).map(asRecord).flatMap((plan) => {
      const planId = text(plan?.id) ?? text(plan?.code);
      const planAr = text(plan?.name_ar);
      const planEn = text(plan?.name_en);
      return planId && (planAr || planEn) ? [{ id: planId, nameAr: planAr, nameEn: planEn }] : [];
    });
    return [{ id, nameAr, nameEn, plans }];
  });
}

export type PublicProvider = { id: string; nameAr?: string; nameEn?: string; city?: string; type?: string };

/** GET /providers?type=…: the public provider rows (the backend strips every private field). */
export function parsePublicProviders(payload: unknown): PublicProvider[] {
  return listOf(payload).flatMap((row) => {
    const id = text(row.id);
    const nameAr = text(row.name_ar) ?? text(row.name);
    const nameEn = text(row.name_en);
    return id && (nameAr || nameEn) ? [{ id, nameAr, nameEn, city: text(row.city), type: text(row.type) }] : [];
  });
}

/**
 * The sign-in page with the way back (journey 1: the guest returns to where the action was). A path that is not a page of
 * this site is not passed on.
 */
export function signInHref(locale: string, next: string): string {
  const back = safeNextPath(next);
  return back ? `/${locale}/login?next=${encodeURIComponent(back)}` : `/${locale}/login`;
}
