import Link from "next/link";
import { localizedText } from "@/lib/i18n/localized-field";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientWishlist } from "@/lib/api/wishlist-server";
import { extractWishlist } from "@/lib/api/wishlist";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { formatPrice } from "@/lib/format-price";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { WishlistRowActions } from "@/components-next/pharmacy/wishlist-row-actions";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Wishlist");
  const routeState = await getTranslations("RouteState");
  const product = await getTranslations("PublicProduct");
  const token = await requirePatientAccess(locale);
  const response = await getPatientWishlist(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/pharmacy`;
  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("title")} backHref={back}>
        <div className={styles.state}><RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={routeState("retry")} /></div>
      </CoreShell>
    );
  }
  const items = extractWishlist(await response.json().catch(() => null));
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  return (
    <CoreShell locale={locale} title={t("title")} backHref={back}>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("title")}</h1>
          {items.length ? <p className={styles.count}>{t("notice")}</p> : null}
        </div>
        {items.length ? (
          <ul className={styles.rows} aria-label={t("title")}>
            {items.map((item) => {
              const name = localizedText({ locale, ar: item.nameAr, en: item.nameEn }) ?? t("untitled");
              return (
                <li key={item.id} className={styles.rowWrap}>
                  <Link className={styles.row} href={`/${locale}/medicines/${item.id}`}>
                    <span className={styles.rowMedia}><FIcon icon="pill" tone={PHARMACY_TONE} size={48} /></span>
                    <span className={styles.rowBody}>
                      <span className={styles.rowName}>{name}</span>
                      {item.brand ? <span className={styles.rowSub}>{item.brand}</span> : null}
                      <span className={styles.rowMeta}>
                        {item.price !== undefined ? <span className={styles.rowPrice}>{formatPrice(locale, item.price).text}</span> : null}
                        {item.inStock === false ? <StatusChip label={t("outOfStock")} tone={PHARMACY_TONE} /> : item.inStock === true ? <StatusChip label={t("inStock")} tone="mint" /> : null}
                        {item.requiresPrescription === true ? <StatusChip label={t("needsRx")} tone="amber" /> : null}
                        {item.onlineOnly === true ? <StatusChip label={product("onlineOnly")} tone="ink" /> : null}
                      </span>
                    </span>
                    <span className={styles.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                  </Link>
                  <WishlistRowActions locale={locale} itemId={item.id} name={name} rx={item.requiresPrescription === true} onlineOnly={item.onlineOnly === true} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.state}>
            <EmptyState icon="heart" tone={PHARMACY_TONE} title={t("empty")} />
            <Link href={`/${locale}/c`} className={`nabd-button nabd-button--primary nabd-button--lg nabd-button--full ${styles.linkButton}`}>
              <span className="nabd-button__label">{t("shop")}</span>
            </Link>
          </div>
        )}
      </div>
    </CoreShell>
  );
}
