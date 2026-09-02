import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { CartView } from "@/components-next/cart-view";
import { ShoppingCart } from "lucide-react";
import styles from "./cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShoppingCart size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{t("title")}</h1>
        </div>
      </section>

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
    </main>
  );
}
