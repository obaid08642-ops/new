import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalSummary } from "@/lib/api/vitals";
import { getPatientVitalSummary } from "@/lib/api/vitals-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const token = await requirePatientAccess(locale);
  const response = await getPatientVitalSummary(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const vitals = extractVitalSummary(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{vitals.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="vitals-grid" aria-label={t("title")}>{vitals.map((vital) => <article className="vital-card" key={vital.key}><strong>{t(`vitals.${vital.key}`)}</strong><p>{vital.value}{vital.unit ? ` ${vital.unit}` : ""}</p>{vital.measuredAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(vital.measuredAt))}</span> : null}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
