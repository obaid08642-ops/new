import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ProvidersClient } from "@/components-next/ordering/providers-client";
import { loadOrderingContext } from "@/components-next/ordering/ordering-context";
import { isLocale } from "@/lib/i18n";
import { contextQuery, payOf, placeOf } from "@/lib/ordering/context";
import { kindOf, optionalToken } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ kind?: string; place?: string; pay?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderingFlow" });
  return { title: t("matchTitle"), robots: { index: false, follow: false } };
}

/** Ord05 (canvas/Ord05-BestMatchCompare): best match, compare list with sort and filters, and the suggested split. */
export default async function ProvidersPage({ params, searchParams }: Props) {
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
  const { bar, point } = await loadOrderingContext({ locale, token, path: "/labs/providers", kind, place, pay });
  return (
    <ConsultPage locale={locale} title={t("matchTitle")} backHref={`/${locale}/labs/basket${contextQuery({ kind, place, pay })}`}>
      {bar}
      <ProvidersClient locale={locale} kind={kind} place={place} pay={pay} point={point} />
    </ConsultPage>
  );
}
