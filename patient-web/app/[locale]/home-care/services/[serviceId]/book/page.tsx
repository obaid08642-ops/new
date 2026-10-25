import type { Metadata } from "next";
import { pickName } from "@/lib/i18n/localized";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareService, parseHomeCareServiceId } from "@/lib/api/home-care-services";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { nurseGenderOf, nurseSortOf, parseNurses, type NurseGender, type NurseSort } from "@/lib/nursing/nurse";
import { servicePayFlow } from "@/lib/nursing/pay-flow";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Hero, Notice, RowCard } from "@/components-next/consult/consult-parts";
import { Caret, NURSING, NurseFacts, RowList, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import consult from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; serviceId: string }>; searchParams?: Promise<{ sort?: string; gender?: string; pay?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingWeb" });
  return { title: t("bookTitle"), robots: { index: false, follow: false } };
}

/**
 * The nurses who give a service (the app's service-details): a card each with facility, rating, years, availability and the price, a sort and a
 * gender filter, the prescription notice for services that need one, and "Select", which opens the nurse's page where the day, time, address and payment are chosen.
 */
export default async function HomeCareBookPage({ params, searchParams }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale) || !parseHomeCareServiceId(serviceId).success) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const sort: NurseSort = nurseSortOf(query.sort);
  const gender: NurseGender = nurseGenderOf(query.gender);
  const pay = servicePayFlow(query.pay);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/home-care/services/${encodeURIComponent(serviceId)}`;
  const params2 = new URLSearchParams({ type: serviceId });
  if (sort !== "any") params2.set("sort", sort);
  if (gender !== "any") params2.set("gender", gender);
  const [serviceRes, nursesRes] = await Promise.all([
    getPatientHomeCareService(serviceId, token),
    callPatientApi(`/home-care/providers?${params2.toString()}`, { cache: "no-store" }, token),
  ]);
  if (serviceRes.status === 401) redirect(`/${locale}/login`);
  if (serviceRes.status === 403 || serviceRes.status === 404) notFound();
  const service = serviceRes.ok ? extractHomeCareService(await serviceRes.json().catch(() => null)) : null;
  if (!service || !nursesRes.ok) {
    return (
      <ConsultPage locale={locale} title={t("bookTitle")} backHref={back}>
        <ConsultState kind="error" title={t("serviceUnavailableTitle")} body={t("serviceUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  const nurses = parseNurses(await nursesRes.json().catch(() => null));
  const name = pickName(locale, service.names) ?? t("serviceTitle");
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;
  const href = (over: Partial<{ sort: NurseSort; gender: NurseGender }>) => {
    const next = { sort, gender, ...over };
    const qs = new URLSearchParams({ ...(next.sort !== "any" ? { sort: next.sort } : {}), ...(next.gender !== "any" ? { gender: next.gender } : {}), ...(pay === "insurance" ? { pay: "insurance" } : {}) }).toString();
    return `/${locale}/home-care/services/${encodeURIComponent(serviceId)}/book${qs ? `?${qs}` : ""}`;
  };
  const profileHref = (id: string) => `/${locale}/nursing/nurses/${encodeURIComponent(id)}?${new URLSearchParams({ serviceId, ...(pay === "insurance" ? { pay: "insurance" } : {}) }).toString()}`;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return (
    <ConsultPage locale={locale} title={t("bookTitle")} backHref={back}>
      <Hero icon={serviceIcon(service.nameAr, service.nameEn)} tone={NURSING.tone} title={name} sub={service.price !== undefined ? money(locale, service.price) : t("eyebrow")} />
      {/* Injections and drips need a prescription the nurse can see (the catalogue says which services do); an unknown answer asks for it too, as the app does. */}
      {service.requiresPrescription !== false ? <Notice warn>{t("rxNotice")}</Notice> : null}
      <nav className={consult.segLinks} aria-label={t("sortTitle")}>
        <Link href={href({ sort: "any" })} replace aria-current={sort === "any" ? "page" : undefined}>{t("sortAny")}</Link>
        <Link href={href({ sort: "rating" })} replace aria-current={sort === "rating" ? "page" : undefined}>{t("sortRating")}</Link>
      </nav>
      <nav className={consult.segLinks} aria-label={t("filterGender")}>
        {(["any", "female", "male"] as const).map((value) => (
          <Link key={value} href={href({ gender: value })} replace aria-current={gender === value ? "page" : undefined}>{t(`gender_${value}`)}</Link>
        ))}
      </nav>
      {nurses.length === 0 ? (
        <ConsultState kind="empty" icon="user-circle" tone={NURSING.tone} title={t("noNurses")} />
      ) : (
        <RowList label={t("chooseNurse")}>
          {nurses.map((nurse) => {
            const facts = [
              nurse.rating !== undefined ? t("ratingLine", { rating: number.format(nurse.rating), count: number.format(nurse.reviewCount ?? 0) }) : "",
              nurse.years !== undefined ? t("yearsLine", { count: nurse.years }) : "",
              nurse.price !== undefined ? money(locale, nurse.price) : t("priceAtBooking"),
            ].filter(Boolean);
            return (
              <li key={nurse.id}>
                <RowCard
                  href={profileHref(nurse.id)}
                  icon="user-circle"
                  tone={NURSING.tone}
                  title={pickText(locale, nurse.nameAr, nurse.nameEn) ?? ""}
                  sub={nurse.facility}
                  extra={<NurseFacts facts={facts} available={nurse.availableNow === undefined ? undefined : { label: nurse.availableNow ? t("availableNow") : t("notNow"), good: nurse.availableNow }} />}
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
