import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { isLocale } from "@/lib/i18n";
import { CartView } from "@/components-next/cart-view";
import styles from "./cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieNames.access)?.value;

  let serverCart = null;
  if (token) {
    try {
      const response = await callPatientApi("/cart", {}, token);
      if (response.ok) {
        serverCart = extractCartSummary(await response.json().catch(() => null));
      }
    } catch {
      // Graceful fallback to client cart
    }
  }

  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const hasServerItems = serverCart && serverCart.groups.some((group) => group.items.length > 0);
  const currency = serverCart?.currency || t("currency");
  const amount = (value?: number) => (value === undefined ? "—" : `${value} ${currency}`);

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{t("title")}</h1>
          <p>{t("notice")}</p>
        </div>
        <span className={styles.heroIcon}>
          <ShoppingCart size={27} aria-hidden="true" />
        </span>
      </section>

      {/* Live Client Cart View with item adjustments, removal, checkout button */}
      <CartView
        locale={locale}
        labels={{
          title: t("title"),
          empty: t("empty"),
          subtotal: t("subtotal"),
          total: t("total"),
          checkout: locale === "ar" ? "متابعة الشراء والدفع" : "Proceed to Checkout",
          browseCatalog: locale === "ar" ? "تصفح كتالوج الأدوية" : "Browse Pharmacy Catalog",
          currency: t("currency"),
          prescriptionNotice:
            locale === "ar"
              ? "تحتوي سلتك على أدوية تتطلب وصفة طبية، سيُطلب منك إرفاقها عند تأكيد الطلب."
              : "Your cart contains prescription items. You will be prompted to attach a prescription during checkout.",
        }}
      />

      {hasServerItems && serverCart && (
        <section className={styles.groups} style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            {locale === "ar" ? "العناصر المتزامنة مع حسابك" : "Items Synced with Account"}
          </h2>
          {serverCart.groups
            .filter((group) => group.items.length)
            .map((group) => (
              <article className={styles.group} key={group.kind}>
                <div className={styles.groupHead}>
                  <h3>{group.kind}</h3>
                  <span>
                    {group.count ?? group.items.length} {t("itemCount")}
                  </span>
                </div>
                {group.items.map((item) => (
                  <div className={styles.item} key={item.lineId}>
                    <div>
                      <strong>{item.name || item.serviceId}</strong>
                      <span>
                        {item.quantity === undefined ? "—" : item.quantity} × {amount(item.price)}
                      </span>
                    </div>
                    <span>{item.paymentMethod || "—"}</span>
                  </div>
                ))}
              </article>
            ))}
        </section>
      )}
    </main>
  );
}
