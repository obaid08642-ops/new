import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/cart", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const cart = extractCartSummary(await response.json().catch(() => null));
  if (!cart) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><ShoppingCart size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const hasItems = cart.groups.some((group) => group.items.length > 0);
  const currency = cart.currency || t("currency");
  const amount = (value?: number) => value === undefined ? "—" : `${value} ${currency}`;
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{hasItems ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><ShoppingCart size={27} aria-hidden="true" /></span></section>
    {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count ?? group.items.length} {t("itemCount")}</span></div>{group.items.map((item) => <div className={styles.item} key={item.lineId}><div><strong>{item.name || item.serviceId}</strong><span>{item.quantity === undefined ? "—" : item.quantity} × {amount(item.price)}</span></div><span>{item.paymentMethod || "—"}</span></div>)}</article>)}</section><section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong></section></> : <section className={styles.state}><ShoppingCart size={25} aria-hidden="true" /><h2>{t("empty")}</h2><Link className={styles.back} href={`/${locale}/medicines`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link></section>}
  </main>;
}
