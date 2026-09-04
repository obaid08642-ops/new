import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { CheckoutFlow } from "@/components-next/checkout-flow";
import styles from "../cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartCheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const rtl = locale === "ar" || locale === "ur";
  const Direction = rtl ? ArrowLeft : ArrowRight;

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{locale === "ar" ? "إتمام الطلب والدفع الآمن" : "Checkout & Secure Payment"}</h1>
          <p>{locale === "ar" ? "حدد عنوان التوصيل وطريقة الدفع لإتمام طلبك فوراً" : "Enter delivery details and select payment method"}</p>
        </div>
        <span className={styles.heroIcon}>
          <CreditCard size={27} aria-hidden="true" />
        </span>
      </section>

      {/* Complete Responsive Checkout Flow */}
      <CheckoutFlow locale={locale} />

      <Link className={styles.back} href={`/${locale}/cart`} style={{ marginTop: "2rem" }}>
        <Direction size={17} aria-hidden="true" />
        {t("back")}
      </Link>
    </main>
  );
}
