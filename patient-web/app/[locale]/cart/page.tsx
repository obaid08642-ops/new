import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CartLineActions } from "@/components-next/cart-line-actions";
import { CartCheckoutForm } from "@/components-next/cart-checkout-form";
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
  const addressResponse = await callPatientApi("/users/me/addresses", {}, token);
  const addressesPayload = addressResponse.ok ? await addressResponse.json().catch(() => null) : null;
  const addresses = Array.isArray(addressesPayload) ? addressesPayload.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const address = value as Record<string, unknown>;
    return typeof address.id === "string" ? [{ id: address.id, label: typeof address.label === "string" ? address.label : undefined, street: typeof address.street === "string" ? address.street : undefined, city: typeof address.city === "string" ? address.city : undefined, lat: typeof address.lat === "number" ? address.lat : undefined, lng: typeof address.lng === "number" ? address.lng : undefined, is_default: address.is_default === true }] : [];
  }) : [];
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const hasItems = cart.groups.some((group) => group.items.length > 0);
  const currency = cart.currency || t("currency");
  const amount = (value?: number) => value === undefined ? "—" : `${value} ${currency}`;
  const supportsPharmacyCheckout = hasItems && cart.groups.filter((group) => group.items.length > 0).every((group) => group.kind === "pharmacy");
  const actionLabels = { updateQuantity: t("updateQuantity"), removeItem: t("removeItem"), removing: t("removing"), checkoutFailed: t("checkoutFailed") };
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{hasItems ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><ShoppingCart size={27} aria-hidden="true" /></span></section>
    {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count ?? group.items.length} {t("itemCount")}</span></div>{group.items.map((item) => <div className={styles.item} key={item.lineId}><div><strong>{item.name || item.serviceId}</strong><span>{item.quantity === undefined ? "—" : item.quantity} × {amount(item.price)}</span></div><span>{item.paymentMethod || "—"}</span><CartLineActions lineId={item.lineId} quantity={item.quantity || 1} labels={actionLabels} /></div>)}</article>)}</section><section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong></section>{supportsPharmacyCheckout ? <CartCheckoutForm locale={locale} initialAddresses={addresses} labels={{ checkout: t("checkout"), cashOnDelivery: t("cashOnDelivery"), address: t("address"), chooseAddress: t("chooseAddress"), noAddresses: t("noAddresses"), manageAddresses: t("manageAddresses"), checkoutInProgress: t("checkoutInProgress"), checkoutFailed: t("checkoutFailed"), orderCreated: t("orderCreated"), newAddress: t("newAddress"), addressLabel: t("addressLabel"), street: t("street"), city: t("city"), latitude: t("latitude"), longitude: t("longitude"), saveAddress: t("saveAddress") }} /> : null}</> : <section className={styles.state}><ShoppingCart size={25} aria-hidden="true" /><h2>{t("empty")}</h2><Link className={styles.back} href={`/${locale}/medicines`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link></section>}
  </main>;
}
