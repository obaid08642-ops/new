import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareService } from "@/lib/api/home-care-services";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { NURSING, ServiceChips, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import consult from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

/** One home care service (canvas/ServiceHub detail): its name, what it is, the price and duration, and whether insurance covers it. */
export default async function HomeCareServicePage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareService(serviceId, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/home-care/services`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("serviceTitle")} backHref={back}>
        <ConsultState kind="error" title={t("serviceUnavailableTitle")} body={t("serviceUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  const service = extractHomeCareService(await response.json().catch(() => null));
  if (!service) notFound();
  const name = pickText(locale, service.nameAr, service.nameEn) ?? "";
  const description = pickText(locale, service.descriptionAr, service.descriptionEn);
  const duration = [service.durationValue, service.duration].filter(Boolean).join(" ");
  const rows: FactRow[] = [
    ...(service.price !== undefined ? [{ label: t("priceLabel"), value: money(locale, service.price), icon: "tag" as const, tone: NURSING.tone }] : []),
    ...(duration ? [{ label: t("durationLabel"), value: duration, icon: "clock-counter-clockwise" as const, tone: NURSING.tone }] : []),
  ];
  return (
    <ConsultPage locale={locale} title={name || t("serviceTitle")} backHref={back}>
      <Hero icon={serviceIcon(service.nameAr, service.nameEn)} tone={NURSING.tone} title={name} sub={t("eyebrow")}>
        <ServiceChips insurance={service.insuranceAvailable ? t("insurance") : undefined} />
      </Hero>
      {description ? (
        <SectionCard id="service-about" title={t("aboutTitle")}>
          <p className={consult.body}>{description}</p>
        </SectionCard>
      ) : null}
      {rows.length > 0 ? (
        <SectionCard id="service-facts">
          <Facts rows={rows} label={t("serviceTitle")} />
        </SectionCard>
      ) : null}
      <Notice>{t("bookingNotice")}</Notice>
    </ConsultPage>
  );
}
