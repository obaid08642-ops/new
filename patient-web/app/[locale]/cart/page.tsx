import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CartScreen } from "@/components-next/pharmacy/cart-screen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "CartScreen" });
  return { title: t("title") };
}

/**
 * The cart is open to a guest and makes no request of its own: the cart of this browser (lib/context/CartContext) is all
 * it needs, and signing in is asked for at checkout (handoff §1). The token is only read to know whether to show the
 * delivery address card; no price, stock or server cart is read.
 */
export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const signedIn = Boolean(await getOptionalPatientAccessToken());
  return <CartScreen locale={locale} signedIn={signedIn} />;
}
