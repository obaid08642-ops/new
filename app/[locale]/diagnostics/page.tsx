import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function DiagnosticsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const [labsResponse, radiologyResponse] = await Promise.all([getDiagnosticBookings(token, "labs"), getDiagnosticBookings(token, "radiology")]);
  if (labsResponse.status === 401 || radiologyResponse.status === 401) redirect(`/${locale}/login`);
  const toState = async (domain: "labs" | "radiology", response: Response) => ({ domain, response, bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : [] });
  const domains = await Promise.all([toState("labs", labsResponse), toState("radiology", radiologyResponse)]);
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><div className="diagnostic-grid">{domains.map(({ domain, response, bookings }) => <section className="status-card" key={domain}><h2>{t(`${domain}.title`)}</h2>{!response.ok ? <p role="alert">{response.status === 403 || response.status === 404 ? t("forbidden") : t("unavailable")}</p> : bookings.length === 0 ? <p>{t("empty")}</p> : <div className="diagnostic-list">{bookings.map((booking) => <Link className="diagnostic-card" key={booking.id} href={`/${locale}/diagnostics/${domain}/${booking.id}`}><strong>{domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label")}</strong><span>{booking.state || t("statusUnavailable")}</span>{booking.scheduledAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</span> : null}<span className="diagnostic-open">{t("open")}</span></Link>)}</div>}</section>)}</div></main>;
}
