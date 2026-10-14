import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings, type DiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LAB, RADIOLOGY, pickText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { LocalDate } from "@/components-next/orders/local-date";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import orders from "@/components-next/orders/orders.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";
import { diagnosticBookingHref } from "@/lib/diagnostics-links";

type Props = { params: Promise<{ locale: string }> };

const DOMAINS: DiagnosticDomain[] = ["labs", "radiology"];

/** The patient's lab and radiology requests (canvas/Orders): one card per booking with its name, date and status, a link to it and, for a lab booking, the way to upload the insurance document. */
export default async function DiagnosticsBookingsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const d = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const responses = await Promise.all(DOMAINS.map((domain) => getDiagnosticBookings(token, domain)));
  if (responses.some((r) => r.status === 401)) redirect(`/${locale}/login`);
  const backHref = `/${locale}/diagnostics`;
  if (responses.every((r) => !r.ok)) {
    return (
      <ConsultPage locale={locale} title={t("bookingsTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("bookingsErrorTitle")} body={d("unavailable")} retryLabel={t("retry")} actionLabel={t("backToHub")} actionHref={backHref} />
      </ConsultPage>
    );
  }
  const lists = await Promise.all(responses.map(async (r) => (r.ok ? extractDiagnosticBookings(await r.json().catch(() => null)) : [])));
  const rows = DOMAINS.flatMap((domain, i) => lists[i].map((booking) => ({ domain, booking })));

  return (
    <ConsultPage locale={locale} title={t("bookingsTitle")} backHref={backHref}>
      {rows.length === 0 ? (
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("bookingsEmptyTitle")} body={t("bookingsEmptyBody")} actionLabel={t("bookingsBrowse")} actionHref={backHref} />
      ) : (
        <ul className={orders.list} aria-label={t("bookingsTitle")}>
          {rows.map(({ domain, booking }) => {
            const visual = domain === "labs" ? LAB : RADIOLOGY;
            // needs-review issue 636: a lab booking shows its first test name (the list sends items), the generic label only without one
            const title = domain === "labs" ? pickText(locale, booking.testNameAr, booking.testNameEn) ?? d("labs.label") : pickText(locale, booking.scanNameAr, booking.scanNameEn) ?? d("radiology.label");
            const status = diagStatus(booking.state);
            return (
              <li className={orders.order} key={`${domain}-${booking.id}`}>
                <Link className={orders.orderLink} href={diagnosticBookingHref(locale, domain, booking.id)}>
                  <FIcon icon={visual.icon} tone={visual.tone} size={44} />
                  <span className={orders.orderText}>
                    <span className={orders.orderTitle}>{title}</span>
                    <span className={orders.orderMeta}>{booking.scheduledAt ? <LocalDate iso={booking.scheduledAt} locale={locale} /> : null}</span>
                  </span>
                  <span className={orders.orderChip}>
                    <StatusChip label={status.key === "unknown" ? d("statusUnavailable") : t(`status_${status.key}`)} tone={status.tone} />
                  </span>
                </Link>
                <div className={styles.coverageRow}>
                  {booking.hasReport ? <span className={orders.itemsOnly}>{d("reportReady")}</span> : <span />}
                  {domain === "labs" ? <ButtonLink href={`/${locale}/diagnostics/insurance-upload?bookingId=${encodeURIComponent(booking.id)}`} label={t("uploadInsurance")} variant="outline" size="sm" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
