import Link from "next/link";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { PharmacyBroadcastSubmit } from "./pharmacy-broadcast-submit";
import styles from "../cart.module.css";

const CheckoutFlow = dynamic(() => import("@/components-next/checkout-flow").then((m) => m.CheckoutFlow), { ssr: false });

type Props = { params: Promise<{ locale: string }> };

export default async function CartCheckoutPreviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/cart/checkout", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const cart = extractCartSummary(await response.json().catch(() => null));
  if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CreditCard size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const currency = cart.currency || t("currency");
  const amount = (value?: number) => value === undefined ? "—" : `${value} ${currency}`;
  const pharmacyItems = cart.groups.filter((group) => group.kind === "pharmacy").flatMap((group) => group.items.flatMap((item) => typeof item.name === "string" && item.name.trim() && typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? [{ name: item.name, quantity: item.quantity, sku: item.serviceId }] : []));

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><CreditCard size={27} aria-hidden="true" /></span></section>
      <section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong></section>
      <CheckoutFlow locale={locale} />
      {pharmacyItems.length > 0 && <PharmacyBroadcastSubmit locale={locale} items={pharmacyItems} labels={{ submit: locale === "ar" ? "إرسال طلب الصيدلية للحصول على عروض" : "Send pharmacy request for offers", loading: locale === "ar" ? "جارٍ إرسال الطلب…" : "Sending request…", error: locale === "ar" ? "تعذر إرسال طلب الصيدلية. لم ينشأ دفع أو سعر نهائي." : "The pharmacy request could not be sent. No payment or final price was created." }} />}
      <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
    </main>
  );
}
