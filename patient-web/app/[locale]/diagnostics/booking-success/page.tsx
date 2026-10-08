import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks } from "@/components-next/consult/consult-parts";
import { LAB, RADIOLOGY } from "@/components-next/diagnostics/diag-parts";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import rx from "@/components-next/pharmacy/rx.module.css";
import consult from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; domain?: string }> };

/** The booking is registered (canvas/BookingConfirm, the result): the check, the line, the booking number the server holds, and the ways on. */
export default async function DiagnosticsBookingSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || "").trim();
  const domain = sp.domain === "radiology" ? "radiology" : "labs";
  if (!isLocale(locale) || !bookingId) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/${domain}/bookings/${encodeURIComponent(bookingId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const visual = domain === "labs" ? LAB : RADIOLOGY;

  return (
    <ConsultPage locale={locale} title={t("successTitle")} backHref={`/${locale}/diagnostics/bookings`}>
      <section className={`${rx.card} ${consult.hero}`} role="status">
        <FIcon icon="check-circle" tone={visual.tone} size={72} />
        <div className={consult.heroText}>
          <h2 className={consult.heroTitle}>{t("successHeading")}</h2>
          <span className={consult.heroSub}>{t("successBody")}</span>
        </div>
        <div className={consult.fact}>
          <span className={consult.factText}>
            <span className={consult.factLabel}>{t("bookingNumber")}</span>
            <span className={consult.codeText}>{bookingId}</span>
          </span>
        </div>
      </section>
      <ActionLinks
        actions={[
          { href: `/${locale}/diagnostics/${domain}/${encodeURIComponent(bookingId)}`, label: t("bookingDetailsCta") },
          { href: `/${locale}/diagnostics/bookings`, label: t("myRequests"), variant: "outline" },
          { href: `/${locale}/diagnostics`, label: t("backToHub"), variant: "ghost" },
        ]}
      />
    </ConsultPage>
  );
}
