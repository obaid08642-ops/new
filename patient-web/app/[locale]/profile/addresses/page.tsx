import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { AddressSelectScreen } from "@/components-next/delivery-address/address-select-screen";
import forms from "@/components-next/consult/consult.module.css";
import { AddAddressForm, AddressList, type PatientAddress } from "@/components-next/account/address-book";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ select?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Addresses" });
  const canonical = localizedUrl(locale, "/profile/addresses");
  return {
    title: t("title"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/profile/addresses")])), "x-default": localizedUrl("ar", "/profile/addresses") },
    },
    robots: { index: false, follow: false },
  };
}

/**
 * `/profile/addresses`, the address book (merge map 2, section 8): the saved addresses with a remove on each and the form to
 * add one. With `?select=1` it is the pick mode that replaced `/delivery/address-select`: choose which saved address pharmacy
 * orders are delivered to. The app keeps its map picker as the pick-on-map step; the website has no map step.
 */
export default async function AddressesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { select } = await searchParams;
  if (select === "1") return <AddressSelectScreen locale={locale} />;

  const t = await getTranslations("Addresses");
  const rs = await getTranslations("RouteState");
  const a = await getTranslations("AccountWeb");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const back = `/${locale}/profile`;
  if (!response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={a("addressesErrorTitle")} body={a("addressesErrorBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  // Q10: GET /users/me/addresses answers a plain array; reading `.addresses` showed an empty list to every patient.
  const payload = await response.json().catch(() => null);
  const addresses: PatientAddress[] = Array.isArray(payload) ? payload : (payload?.addresses ?? payload?.data ?? []);

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={back}>
      <SectionCard id="saved" title={t("listLabel")}>
        {addresses.length === 0 ? <p className={`${forms.body} ${forms.muted}`}>{t("empty")}</p> : <AddressList addresses={addresses} />}
      </SectionCard>
      <SectionCard id="add"><AddAddressForm locale={locale} /></SectionCard>
    </ConsultPage>
  );
}
