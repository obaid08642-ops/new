import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareServices } from "@/lib/api/home-care-services";
import { getPatientHomeCareServices, getPublicHomeCareServices } from "@/lib/api/home-care-services-server";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { Caret, NURSING, RowList, ServiceChips, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { SearchForm, money, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/home-care/services", t("home-care/services.title"), t("home-care/services.description"));
}

/** The home care services (canvas/ServiceHub list): a search and a row per service with its price, duration and insurance. */
export default async function HomeCareServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await getOptionalPatientAccessToken();
  let response = token ? await getPatientHomeCareServices(token) : await getPublicHomeCareServices();
  if (!response || !response.ok) {
    response = await getPublicNursingCatalog();
  }
  const services = response && response.ok ? extractHomeCareServices(await response.json().catch(() => null)) : [];
  const query = q.trim().toLocaleLowerCase(locale);
  const filtered = services.filter((service) =>
    [service.nameAr, service.nameEn, service.descriptionAr, service.descriptionEn]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase(locale).includes(query)),
  );
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;
  return (
    <ConsultPage locale={locale} title={t("servicesTitle")} backHref={`/${locale}/home-care`}>
      <SearchForm defaultValue={q} placeholder={t("searchPlaceholder")} label={t("searchLabel")} submitLabel={t("searchSubmit")} />
      {filtered.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("servicesEmpty")} body={services.length === 0 ? t("servicesEmptyBody") : t("noMatch")} />
      ) : (
        <RowList label={t("servicesTitle")}>
          {filtered.map((service) => {
            const name = pickText(locale, service.nameAr, service.nameEn) ?? "";
            const description = pickText(locale, service.descriptionAr, service.descriptionEn);
            const duration = [service.durationValue, service.duration].filter(Boolean).join(" ");
            return (
              <li key={service.id}>
                <RowCard
                  href={`/${locale}/home-care/services/${encodeURIComponent(service.id)}`}
                  icon={serviceIcon(service.nameAr, service.nameEn)}
                  tone={NURSING.tone}
                  title={name}
                  sub={[description, service.price !== undefined ? money(locale, service.price) : ""].filter(Boolean).join(" · ") || undefined}
                  extra={<ServiceChips duration={duration || undefined} insurance={service.insuranceAvailable ? t("insurance") : undefined} />}
                  caret={caret}
                />
              </li>
            );
          })}
        </RowList>
      )}
    </ConsultPage>
  );
}
