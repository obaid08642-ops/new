import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { VectorOrders } from "@/components-next/vector-illustrations";
import { callPatientApi } from "@/lib/api/upstream";
import { extractCartSummary } from "@/lib/api/cart";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CartView } from "@/components-next/cart-view";
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
  const serverCart = response.ok ? extractCartSummary(await response.json().catch(() => null)) : null;

  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  const hasServerItems = serverCart && serverCart.groups.some((group) => group.items.length > 0);
  const currency = serverCart?.currency || t("currency");
  const amount = (value?: number) => (value === undefined ? "—" : `${value} ${currency}`);

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" color="#1E332E" />
            {t("eyebrow")}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("notice")}</p>
        </div>
        <span className={styles.heroIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as any}>
          <VectorOrders size={48} aria-hidden="true" />
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
        <section className={styles.groups} style={{ marginTop: 16, display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
            {locale === "ar" ? "العناصر المتزامنة مع حسابك" : "Items Synced with Account"}
          </h2>
          {serverCart.groups
            .filter((group) => group.items.length)
            .map((group) => (
              <article className={styles.group} key={group.kind}>
                <div className={styles.groupHead}>
                  <h3 style={{ overflowWrap: "anywhere" } as React.CSSProperties}>{group.kind}</h3>
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
          <section className={styles.total}>
            <span>{t("subtotal")}</span>
            <strong>{amount(serverCart.subtotal)}</strong>
            <span>{t("homeVisitFee")}</span>
            <strong>{amount(serverCart.homeVisitFee)}</strong>
            <span>{t("total")}</span>
            <strong>{amount(serverCart.total)}</strong>
          </section>
        </section>
      )}
    </main>
  );
}
