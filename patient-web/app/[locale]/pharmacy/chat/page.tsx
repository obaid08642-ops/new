import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ChatScreen } from "@/components-next/pharmacy/chat-screen";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ orderId?: string | string[]; id?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "PharmacyChat" });
  return { title: t("title") };
}

/** The negotiation with a pharmacy about an order's item (the app's pharmacist chat). No board: tokens, font and shared components only. */
export default async function PharmacyChatPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const orderId = (first(query.orderId) || first(query.id)).trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  return <ChatScreen locale={locale} orderId={orderId} />;
}
