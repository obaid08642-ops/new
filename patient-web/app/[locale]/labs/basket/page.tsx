import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { loadOrderingContext } from "@/components-next/ordering/ordering-context";
import { BasketClient } from "@/components-next/ordering/basket-client";
import { DoctorOrderPrefill } from "@/components-next/ordering/doctor-order-prefill";
import { isLocale } from "@/lib/i18n";
import { payOf, placeOf, whoOf } from "@/lib/ordering/context";
import { parseSingleItem } from "@/lib/ordering/single";
import { loadItem } from "@/lib/ordering/load-item";
import { parseOrderId, parsePrefillIds } from "@/lib/ordering/prefill";
import { kindOf, optionalToken } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ item?: string; kind?: string; place?: string; pay?: string; for?: string; order?: string; pre?: string }> };

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
  const who = whoOf(query.for); // another family member (the patient by default)
  const item = parseSingleItem(query.item); // "Order now": a one-item order that skips the basket
  const token = await optionalToken(locale);
  if (!token) redirect(`/${locale}/login`);
  const t = await getTranslations("OrderingFlow");
  const { bar, point } = await loadOrderingContext({ locale, token, path: "/labs/basket", kind, place, pay, item, who });
  // the doctor's order brought here by its Order button (owner decision 2026-11-08: its items are pre-checked, the patient can untick them)
  const orderId = parseOrderId(query.order);
  const preIds = orderId && !item && kind !== "nursing" ? parsePrefillIds(query.pre) : [];
  const preLines = await Promise.all(preIds.map(async (id) => { const { item: found } = await loadItem(kind, id); return { id, nameAr: found?.nameAr, nameEn: found?.nameEn }; }));

  return (
    <ConsultPage locale={locale} title={t("basketTitle")} backHref={`/${locale}/diagnostics${kind === "radiology" ? "?kind=radiology" : ""}`}>
      {bar}
      {orderId && preLines.length > 0 ? <DoctorOrderPrefill locale={locale} kind={kind} orderId={orderId} lines={preLines} /> : null}
      <BasketClient locale={locale} kind={kind} place={place} pay={pay} who={who} item={item} point={point} hubHref={`/${locale}/diagnostics${kind === "radiology" ? "?kind=radiology" : ""}`} />
    </ConsultPage>
  );
}
