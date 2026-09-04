import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Heart, Pill, ShieldCheck } from "lucide-react";
import { getPatientWishlist } from "@/lib/api/wishlist-server";
import { extractWishlist } from "@/lib/api/wishlist";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./wishlist.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Wishlist");
  let items: any[] = [];
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const response = await getPatientWishlist(token);
      if (response && response.ok) {
        items = extractWishlist(await response.json().catch(() => null));
      }
    }
  } catch {}
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><Heart size={27} aria-hidden="true" /></span></section>
    {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article className={styles.card} key={item.id}><span className={styles.icon}><Pill size={24} aria-hidden="true" /></span><div className={styles.content}><h2>{name}</h2>{item.brand ? <p>{item.brand}</p> : null}<div className={styles.meta}>{item.price !== undefined ? <span>{t("price", { value: item.price })}</span> : <span>{t("priceUnavailable")}</span>}{item.inStock === false ? <span className={styles.out}>{t("outOfStock")}</span> : item.inStock === true ? <span className={styles.in}>{t("inStock")}</span> : null}</div><Link className={styles.link} href={`/${locale}/medicines/${item.id}`}>{t("open")}</Link></div></article>; })}</section> : <section className={styles.state}><Heart size={26} aria-hidden="true" /><h2>{t("empty")}</h2><Link className={styles.link} href={`/${locale}/medicine-catalog`}>{t("shop")}</Link></section>}
  </main>;
}
