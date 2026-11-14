import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { InstantConsultClient } from "@/components-next/ordering/instant-consult-client";
import { extractSpecialties } from "@/lib/api/specialties";
import { getPublicSpecialties } from "@/lib/api/specialties-server";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { optionalToken } from "@/lib/ordering/server";
import { parseResultValues } from "@/lib/ordering/results";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ booking?: string }> };
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "InstantConsult" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Ord11: instant consultation (M8), optionally with the results of one ordering booking attached (POST /ordering/bookings/:id/results/discuss). */
export default async function InstantConsultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await optionalToken(locale);
  if (!token) redirect(`/${locale}/login`);
  const { booking } = await searchParams;
  const t = await getTranslations("InstantConsult");
  const bookingId = booking && ID.test(booking) ? booking : null;
  const [specRes, resultsRes] = await Promise.all([
    getPublicSpecialties(),
    bookingId ? callPatientApi(`/ordering/bookings/${encodeURIComponent(bookingId)}/results`, { cache: "no-store" }, token).catch(() => null) : Promise.resolve(null),
  ]);
  const back = bookingId ? `/${locale}/labs/bookings/${encodeURIComponent(bookingId)}` : `/${locale}/consultations`;
  if (!specRes || !specRes.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("loadErr")} body={t("errGeneric")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const specialties = extractSpecialties(await specRes.json().catch(() => null)).flatMap((s) => {
    const value = s.slug ?? s.nameEn ?? s.nameAr;
    const label = (locale === "ar" || locale === "ur" ? s.nameAr ?? s.nameEn : s.nameEn ?? s.nameAr) ?? value;
    return value && label ? [{ value, label }] : [];
  });
  const attached = resultsRes?.ok ? parseResultValues(await resultsRes.json().catch(() => null)).length : 0;
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      <InstantConsultClient locale={locale} specialties={specialties} bookingId={attached > 0 ? bookingId : null} attachedCount={attached} />
    </ConsultPage>
  );
}
