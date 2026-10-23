import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { loadOrderingContext } from "@/components-next/ordering/ordering-context";
import { BasketClient } from "@/components-next/ordering/basket-client";
import { isLocale } from "@/lib/i18n";
import { payOf, placeOf } from "@/lib/ordering/context";
import { kindOf, optionalToken } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ kind?: string; place?: string; pay?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderingFlow" });
  return { title: t("basketTitle"), robots: { index: false, follow: false } };
}

/** Ord04 (canvas/Ord04-Basket): the basket with the automatic split. The basket itself is local; the split, prices and coverage are the quote's. */
export default async function BasketPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const kind = kindOf(query.kind);
  const place = placeOf(query.place);
  const pay = payOf(query.pay);
  const token = await optionalToken(locale);
  if (!token) redirect(`/${locale}/login`);
  const t = await getTranslations("OrderingFlow");
  const { bar, point } = await loadOrderingContext({ locale, token, path: "/labs/basket", kind, place, pay });

  return (
    <ConsultPage locale={locale} title={t("basketTitle")} backHref={`/${locale}/diagnostics${kind === "radiology" ? "?kind=radiology" : ""}`}>
      {bar}
      <BasketClient locale={locale} kind={kind} place={place} pay={pay} point={point} hubHref={`/${locale}/diagnostics${kind === "radiology" ? "?kind=radiology" : ""}`} />
    </ConsultPage>
  );
}
