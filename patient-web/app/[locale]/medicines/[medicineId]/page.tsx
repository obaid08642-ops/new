import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { parseMedicineId } from "@/lib/api/medicines";
import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; medicineId: string }> };

async function resolvePublicProductSlug(locale: string, medicineId: string): Promise<string | null> {
  try {
    const res = await fetch(patientApiUrl(`/public/product-by-id/${locale}/${encodeURIComponent(medicineId)}`), {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.slug === "string" && data.slug ? data.slug : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) return {};
  const slug = await resolvePublicProductSlug(locale, medicineId);
  return {
    robots: { index: false, follow: false },
    ...(slug ? { alternates: { canonical: localizedUrl(locale, `/p/${encodeURIComponent(slug)}`) } } : {}),
  };
}

/**
 * Legacy catalogue detail URL. The indexable product surface is /{lang}/p/{slug}
 * (catalog v14); this route permanently redirects there to consolidate ranking.
 */
export default async function MedicineDetailPage({ params }: Props) {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) notFound();
  setRequestLocale(locale);
  const slug = await resolvePublicProductSlug(locale, medicineId);
  if (!slug) notFound();
  redirect(`/${locale}/p/${encodeURIComponent(slug)}`);
}
