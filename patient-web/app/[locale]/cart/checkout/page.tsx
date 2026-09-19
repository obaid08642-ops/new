import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { VectorOrders } from "@/components-next/vector-illustrations";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { ClientCheckoutSection } from "@/components-next/client-checkout-section";
import { PharmacyBroadcastSubmit } from "./pharmacy-broadcast-submit";
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
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span style={{ display: "grid", placeItems: "center", inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)" } as React.CSSProperties}><VectorOrders size={24} aria-hidden="true" /></span><h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1><p style={{ overflowWrap: "anywhere" } as React.CSSProperties}>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const cart = extractCartSummary(await response.json().catch(() => null));
  if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span style={{ display: "grid", placeItems: "center", inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)" } as React.CSSProperties}><VectorOrders size={24} aria-hidden="true" /></span><h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1><p style={{ overflowWrap: "anywhere" } as React.CSSProperties}>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const currency = cart.currency || t("currency");
  const amount = (value?: number) => value === undefined ? "—" : `${value} ${currency}`;
  const pharmacyItems = cart.groups.filter((group) => group.kind === "pharmacy").flatMap((group) => group.items.flatMap((item) => typeof item.name === "string" && item.name.trim() && typeof item.quantity === "number" && Number.isFinite(item.quantity) && item.quantity > 0 ? [{ name: item.name, quantity: item.quantity, sku: item.serviceId }] : []));

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("title")}</h1><p style={{ overflowWrap: "anywhere" } as React.CSSProperties}>{t("notice")}</p></div><span className={styles.heroIcon}><VectorOrders size={48} aria-hidden="true" /></span></section>
      <section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong></section>
      <ClientCheckoutSection locale={locale as Locale} />
      {pharmacyItems.length > 0 && <PharmacyBroadcastSubmit locale={locale} items={pharmacyItems} labels={{ submit: locale === "ar" ? "إرسال طلب الصيدلية للحصول على عروض" : "Send pharmacy request for offers", loading: locale === "ar" ? "جارٍ إرسال الطلب…" : "Sending request…", error: locale === "ar" ? "تعذر إرسال طلب الصيدلية. لم ينشأ دفع أو سعر نهائي." : "The pharmacy request could not be sent. No payment or final price was created." }} />}
      <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
    </main>
  );
}
