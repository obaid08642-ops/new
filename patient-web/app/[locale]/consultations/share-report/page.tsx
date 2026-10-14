import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getMyMedicalReports } from "@/lib/api/reports-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { ShareReportPanel } from "@/components-next/share-report";
import rx from "@/components-next/pharmacy/rx.module.css";
import { ConsultPage } from "@/components-next/consult/consult-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "ShareReport" });
  const canonical = localizedUrl(locale, "/consultations/share-report");
  return {
    title: t("title"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/consultations/share-report")])), "x-default": localizedUrl("ar", "/consultations/share-report") },
    },
    robots: { index: false, follow: false },
  };
}

/** Share medical reports as secure links: the patient's own reports, ticked one by one. */
export default async function ShareReportPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ShareReport");
  const token = await requirePatientAccess(locale);
  const response = await getMyMedicalReports(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const reports = response.ok ? ((await response.json().catch(() => null)) ?? []) : [];
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus";
  return (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/appointments`}>
      <p className={rx.lead}>{t("subtitle")}</p>
      <ShareReportPanel reports={reports} locale={locale} origin={origin.replace(/\/$/, "")} />
    </ConsultPage>
  );
}
