import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import DoctorCanonicalPage, { generateMetadata as doctorMetadata } from "../page";

type Props = { params: Promise<{ locale: string; slug: string; city: string }> };

// GEO variant: same doctor with city-enriched canonical + Physician address.
// City param flows through so /doctor/{slug}/{city} is its own indexable entity.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return doctorMetadata({ params: params as unknown as Promise<{ locale: string; slug: string; city?: string }> } as any);
}

export default async function DoctorCityPage({ params }: Props) {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return DoctorCanonicalPage({ params: Promise.resolve({ locale, slug, city }) } as any);
}
