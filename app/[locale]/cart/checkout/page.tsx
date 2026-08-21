import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../cart.module.css";

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
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><CreditCard size={27} aria-hidden="true" /></span></section>
    <section className={styles.total}><span>{t("subtotal")}</span><strong>{cart.subtotal ?? 0} {cart.currency || t("currency")}</strong><span>{t("homeVisitFee")}</span><strong>{cart.homeVisitFee ?? 0} {cart.currency || t("currency")}</strong><span>{t("total")}</span><strong>{cart.total ?? 0} {cart.currency || t("currency")}</strong></section>
    <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
  </main>;
}
