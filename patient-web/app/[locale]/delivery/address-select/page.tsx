import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddressSelectScreen } from "@/components-next/delivery-address/address-select-screen";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "DeliveryAddressSelect" });
  return { title: t("title") };
}

/** Choose the saved address pharmacy orders are delivered to. */
export default async function DeliveryAddressSelectPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <AddressSelectScreen locale={locale} />;
}
