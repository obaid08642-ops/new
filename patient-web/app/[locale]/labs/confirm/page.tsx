import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConfirmClient } from "@/components-next/ordering/confirm-client";
import { loadOrderingContext } from "@/components-next/ordering/ordering-context";
import { isLocale } from "@/lib/i18n";
import { contextQuery, payOf, placeOf, whoOf } from "@/lib/ordering/context";
import { itemPreparation } from "@/lib/ordering/preparation";
import { parseSingleItem } from "@/lib/ordering/single";
import { activeMedicalOrders, kindOf, optionalToken } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ item?: string; kind?: string; place?: string; pay?: string; for?: string; ids?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderingFlow" });
  return { title: t("payTitle"), robots: { index: false, follow: false } };
}

/** Ord07 (canvas/Ord07-ConfirmPay): confirm and pay. The choices come from the previous steps (this browser session); the doctor's orders are read here. */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const kind = kindOf(query.kind);
  const place = placeOf(query.place);
  const pay = payOf(query.pay);
  const who = whoOf(query.for); // another family member (the patient by default)
  const item = parseSingleItem(query.item); // "Order now": a one-item order that skips the basket
  const token = await optionalToken(locale);
  if (!token) redirect(`/${locale}/login`);
  const t = await getTranslations("OrderingFlow");
  const ids = (query.ids ?? "").split(",").filter((i) => /^[A-Za-z0-9_-]{1,128}$/.test(i)).slice(0, 12);
  const [{ bar }, orders, prepRows] = await Promise.all([
    loadOrderingContext({ locale, token, path: "/labs/confirm", kind, place, pay, item, who }),
    pay === "insurance" ? activeMedicalOrders(token) : Promise.resolve([]),
    Promise.all(ids.map(async (id) => [id, await itemPreparation(kind, locale, id)] as const)),
  ]);
  const prep = Object.fromEntries(prepRows);

  return (
    <ConsultPage locale={locale} title={t("payTitle")} backHref={`/${locale}/labs/when${contextQuery({ kind, place, pay, item, who })}`}>
      {bar}
      <ConfirmClient locale={locale} kind={kind} place={place} pay={pay} who={who} item={item} orders={orders} prep={prep} />
    </ConsultPage>
  );
}
