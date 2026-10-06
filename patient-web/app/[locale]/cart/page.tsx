import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractCartSummary } from "@/lib/api/cart";
import { callPatientApi } from "@/lib/api/upstream";
import { getOptionalPatientAccessToken } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CartScreen, type AccountCart } from "@/components-next/pharmacy/cart-screen";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "CartScreen" });
  return { title: t("title") };
}

/**
 * The cart is open to a guest: the cart of this browser is all it needs, and signing in is asked for at checkout
 * (handoff §1). A signed-in patient also gets what the server keeps for the account (GET /cart), shown apart.
 */
export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const token = await getOptionalPatientAccessToken();
  let signedIn = false;
  let account: AccountCart | null = null;
  let accountFailed = false;
  if (token) {
    const response = await callPatientApi("/cart", {}, token);
    // an expired session answers 401: the cart is then the guest's, not an error
    if (response.status !== 401) {
      signedIn = true;
      if (response.ok) {
        const summary = extractCartSummary(await response.json().catch(() => null));
        // only what the screen draws: no patient id, notes or metadata of a line
        account = summary && {
          groups: summary.groups.map((group) => ({
            kind: group.kind,
            subtotal: group.subtotal,
            items: group.items.map((line) => ({ lineId: line.lineId, name: line.name, nameEn: line.nameEn, quantity: line.quantity, price: line.price })),
          })),
          subtotal: summary.subtotal,
          homeVisitFee: summary.homeVisitFee,
          total: summary.total,
        };
      } else {
        accountFailed = true;
      }
    }
  }

  return <CartScreen locale={locale} signedIn={signedIn} account={account} accountFailed={accountFailed} />;
}
