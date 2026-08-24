import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { ArrowUpLeft, CalendarDays, FlaskConical, ScanLine, ShieldCheck } from "lucide-react";
import styles from "./diagnostics.module.css";

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
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.introIcon}><FlaskConical size={27} aria-hidden="true" /></span>
    </section>
    <div className={styles.domains}>{domains.map(({ domain, response, bookings }) => {
      const DomainIcon = domain === "labs" ? FlaskConical : ScanLine;
      return <section className={styles.domain} key={domain}>
        <div className={styles.domainHeading}><span className={styles.domainIcon}><DomainIcon size={19} aria-hidden="true" /></span><h2>{t(`${domain}.title`)}</h2></div>
        {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length === 0 ? <p className={styles.empty}>{t("empty")}</p> : <div className={styles.list}>{bookings.map((booking) => <Link className={styles.card} key={booking.id} href={`/${locale}/diagnostics/${domain}/${booking.id}`}>
          <span className={styles.cardIcon}><DomainIcon size={19} aria-hidden="true" /></span>
          <span className={styles.cardBody}>
            <strong className={styles.name}>{domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label")}</strong>
            <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>
            {booking.scheduledAt ? <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</span> : null}{booking.hasReport ? <span className={styles.status}>{t("reportReady")}</span> : null}
          </span>
          <span className={styles.open}>{t("open")}<ArrowUpLeft size={15} aria-hidden="true" /></span>
        </Link>)}</div>}
      </section>;
    })}</div>
  </main>;
}
