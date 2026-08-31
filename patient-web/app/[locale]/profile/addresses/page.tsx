import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { AddressList, AddAddressForm } from "@/components-next/addresses";

type Props = { params: Promise<{ locale: string }> };

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

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Addresses");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAddresses(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const addresses = response.ok
    ? ((await response.json().catch(() => null))?.addresses ?? [])
    : [];
  return (
    <main className="main addresses-page">
      <header className="addresses-hero">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <AddressList addresses={addresses} locale={locale} />
      <AddAddressForm />
    </main>
  );
}
