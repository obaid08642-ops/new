import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Icon } from "@/components-next/ui-generated/src/Icon";
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
  const token = await requirePatientAccess(locale);
  const response = await getPatientWishlist(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Icon name="heart" size={26} /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const items = extractWishlist(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}><div><p className={styles.eyebrow}><Icon name="shield-check" size={15} />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{items.length ? t("notice") : t("empty")}</p></div><span className={styles.heroIcon}><Icon name="heart" size={27} /></span></section>
    {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article className={styles.card} key={item.id}><span className={styles.icon}><Icon name="pill" size={24} /></span><div className={styles.content}><h2>{name}</h2>{item.brand ? <p>{item.brand}</p> : null}<div className={styles.meta}>{item.price !== undefined ? <span>{t("price", { value: item.price })}</span> : <span>{t("priceUnavailable")}</span>}{item.inStock === false ? <span className={styles.out}>{t("outOfStock")}</span> : item.inStock === true ? <span className={styles.in}>{t("inStock")}</span> : null}</div><Link className={styles.link} href={`/${locale}/medicines/${item.id}`}>{t("open")}</Link></div></article>; })}</section> : <section className={styles.state}><Icon name="heart" size={26} /><h2>{t("empty")}</h2><Link className={styles.link} href={`/${locale}/medicine-catalog`}>{t("shop")}</Link></section>}
  </main>;
}
