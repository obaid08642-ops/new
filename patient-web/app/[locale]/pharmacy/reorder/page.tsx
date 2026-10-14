import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReorderScreen } from "@/components-next/orders/reorder-screen";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string | string[]; id?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderReorder" });
  return { title: t("title") };
}

/** Order an earlier order again: its lines go into the cart of this browser, and the cart's checkout sends the new request. */
export default async function PharmacyReorderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const orderId = (first(query.orderId) || first(query.id)).trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  return <ReorderScreen locale={locale} orderId={orderId} />;
}
