import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { getOffers } from "@/lib/api/offers-server";
import { isLocale } from "@/lib/i18n";
import { parseOffers } from "@/lib/loyalty/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import consult from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/loyalty/loyalty.module.css";

type Props = { params: Promise<{ locale: string }> };

const OFFER = SERVICE_ICONS.points;

/**
 * Offers (merge map 2, section 7: the list and the detail stay): the live campaigns of GET /home/offers as cards with the
 * server's title, provider, discount, price and old price. No discount or price is computed or invented here.
 */
export default async function OffersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("OffersWeb");
  const rs = await getTranslations("RouteState");
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      {body}
    </ConsultPage>
  );
  const failed = () => frame(<ConsultState kind="error" title={t("errorTitle")} body={t("error")} retryLabel={rs("retry")} />);

  let response: Response;
  try {
    response = await getOffers(token);
  } catch {
    return failed();
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return failed();
  const offers = parseOffers(await response.json().catch(() => null));
  if (offers.length === 0) return frame(<ConsultState kind="empty" icon={OFFER.icon} tone={OFFER.tone} title={t("emptyTitle")} body={t("empty")} />);

  const price = (n: number) => t("price", { amount: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n) });
  return frame(
    <ul className={consult.list}>
      {offers.map((o) => (
        <li key={o.id} className={rx.card}>
          <Link href={`/${locale}/offers/${encodeURIComponent(o.id)}`} className={styles.cardLink}>
            <span className={styles.pillRow}>
              <span className={consult.rowTitle}>{o.title}</span>
              {o.discount ? <StatusChip label={t("discount", { value: o.discount })} tone={SERVICE_ICONS.pharmacy.tone} /> : null}
            </span>
            {o.provider ? <span className={consult.rowSub}>{o.provider}</span> : null}
            <span className={styles.prices}>
              {o.price !== undefined ? <strong className={styles.price}><bdi>{price(o.price)}</bdi></strong> : null}
              {o.oldPrice !== undefined && o.oldPrice !== o.price ? <s className={styles.was}><bdi>{price(o.oldPrice)}</bdi></s> : null}
              {o.rating !== undefined ? <span className={consult.rowSub}><bdi>{`★ ${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(o.rating)}`}</bdi></span> : null}
            </span>
            {o.sponsored ? <span className={consult.rowSub}>{t("sponsored")}</span> : null}
          </Link>
        </li>
      ))}
    </ul>,
  );
}
