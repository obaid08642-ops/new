import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionSummaries } from "@/lib/api/prescriptions";
import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }> };

export default async function PrescriptionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const token = await requirePatientAccess(locale);
  const response = await getPatientPrescriptions(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const prescriptions = extractPrescriptionSummaries(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{prescriptions.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="prescription-grid" aria-label={t("title")}>{prescriptions.map((prescription) => <article className="prescription-card" key={prescription.id}><strong>{prescription.state || t("stateUnavailable")}</strong><span>{t("items", { count: prescription.itemCount })}</span>{prescription.createdAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(prescription.createdAt))}</span> : null}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
