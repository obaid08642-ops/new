"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CoreShell } from "@/components-next/core/core-shell";
import { StickyFooter } from "@/components-next/ui-generated/shells";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState, Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Stepper } from "@/components-next/ui-generated/components/Inputs";
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from "@/components-next/ui-generated/icons/fill";
import { useCart, type CartItem } from "@/lib/context/CartContext";
import { formatNumber, formatPrice } from "@/lib/format-price";
import { allowedImageUrl } from "@/lib/image-hosts";
import type { Locale } from "@/lib/i18n";
import { AddressCard } from "./address-card";
import { ButtonLink } from "./button-link";
import { CatalogImage } from "./catalog-image";
import { PHARMACY_TONE } from "./tones";
import { useDeliveryAddress } from "./use-delivery-address";
import cs from "./cart-screen.module.css";
import rx from "./rx.module.css";

/** The lines the server keeps for the signed-in account (GET /cart), already reduced to what the screen shows. */
export type AccountCart = {
  groups: Array<{ kind: string; subtotal?: number; items: Array<{ lineId: string; name?: string; nameEn?: string; quantity?: number; price?: number }> }>;
  subtotal?: number;
  homeVisitFee?: number;
  total?: number;
};

const MAX_QTY = 99;
const KIND_KEYS: Record<string, string> = { pharmacy: "kindPharmacy", lab: "kindLab", radiology: "kindRadiology", doctor: "kindDoctor", home_care: "kindHomeCare" };

function packLine(item: CartItem) {
  return [item.form, item.strength].filter(Boolean).join(" · ");
}

/**
 * The cart, from canvas/Cart. It shows the cart of THIS browser (the product pages fill it; see lib/context/CartContext):
 * the items, their catalogue prices and an estimated total. The delivery fee and the final price are not known until a
 * pharmacy answers, so the screen says so instead of adding a number. A signed-in patient's server cart (GET /cart) is
 * shown apart, as saved in the account, and is never merged into the totals above it.
 */
export function CartScreen({ locale, signedIn, account, accountFailed }: { locale: Locale; signedIn: boolean; account: AccountCart | null; accountFailed: boolean }) {
  const t = useTranslations("CartScreen");
  const router = useRouter();
  const { items, ready, updateQty, removeItem, clearCart, subtotal, hasRxItems } = useCart();
  const [confirming, setConfirming] = useState(false);
  const [announce, setAnnounce] = useState("");
  const address = useDeliveryAddress(signedIn && ready && items.length > 0);

  const checkout = `/${locale}/cart/checkout`;
  const upload = `/${locale}/pharmacy/scan-prescription`;
  const missingPrice = items.some((item) => !(item.price > 0));
  const savedGroups = (account?.groups ?? []).filter((group) => group.items.length > 0);
  const kindLabel = (kind: string) => t(KIND_KEYS[kind] ?? "kindOther");

  const changeQty = (item: CartItem, next: number) => {
    if (next < 1) {
      removeItem(item.id);
      setAnnounce(t("removed", { name: item.name }));
      return;
    }
    updateQty(item.id, next - item.qty);
  };

  const requestButton = <ButtonLink href={checkout} label={t("requestOffers")} />;

  const footer = ready && items.length > 0 ? (
    <StickyFooter label={t("summaryLabel")}>
      <div className={rx.bar}>
        <div className={rx.barTotal}>
          <span className={rx.barLabel}>{t("estimated")}</span>
          <span className={rx.barAmount}>{formatPrice(locale, subtotal).text}</span>
        </div>
        {requestButton}
      </div>
    </StickyFooter>
  ) : undefined;

  const saved = savedGroups.length > 0 ? (
    <section className={rx.card} aria-label={t("savedTitle")}>
      <h2 className={rx.h2}>{t("savedTitle")}</h2>
      <p className={rx.note}>{t("savedNote")}</p>
      {savedGroups.map((group) => (
        <div className={cs.group} key={group.kind}>
          <div className={cs.groupHead}>
            <h3 className={rx.rowTitle}>{kindLabel(group.kind)}</h3>
            {group.subtotal !== undefined ? <span className={cs.groupValue}>{formatPrice(locale, group.subtotal).text}</span> : null}
          </div>
          <ul className={cs.items}>
            {group.items.map((line) => (
              <li className={cs.item} key={line.lineId}>
                <div className={cs.info}>
                  <span className={cs.name}>{(locale === "ar" ? line.name : line.nameEn ?? line.name) ?? kindLabel(group.kind)}</span>
                  {line.quantity !== undefined && line.price !== undefined ? (
                    <span className={cs.sub}>{t("savedLine", { qty: formatNumber(locale, line.quantity), price: formatPrice(locale, line.price).text })}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {account?.homeVisitFee ? (
        <div className={cs.line}><span>{t("savedHomeVisit")}</span><span className={cs.lineValue}>{formatPrice(locale, account.homeVisitFee).text}</span></div>
      ) : null}
      {account?.total !== undefined ? (
        <div className={`${cs.line} ${cs.totalLine}`}><span>{t("savedTotal")}</span><span className={cs.lineValue}>{formatPrice(locale, account.total).text}</span></div>
      ) : null}
    </section>
  ) : accountFailed ? (
    <p role="status" className={rx.note}>{t("savedUnavailable")}</p>
  ) : null;

  let body;
  if (!ready) {
    body = (
      <div className={cs.skeleton} role="status" aria-busy="true">
        <span className={rx.srOnly}>{t("loading")}</span>
        <Skeleton variant="block" />
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <>
        <div className={rx.state}>
          <EmptyState
            icon="pill"
            tone={PHARMACY_TONE}
            title={t("emptyTitle")}
            body={t("emptyBody")}
            actionLabel={t("browse")}
            onAction={() => router.push(`/${locale}/c`)}
            secondaryActionLabel={t("uploadRx")}
            onSecondaryAction={() => router.push(upload)}
          />
        </div>
        {saved}
      </>
    );
  } else {
    body = (
      <div className={cs.layout}>
        <div className={cs.main}>
          <div className={cs.headRow}>
            <p className={cs.headNote}>{t("deviceNote")}</p>
            {/* the board's cart header button: the filled trash glyph in the design system's 44 px outlined circle */}
            <button type="button" className="nabd-icon-button nabd-icon-button--md nabd-icon-button--outlined nabd-icon-button--circle nabd-icon-button--tone-neutral" aria-label={t("emptyCart")} onClick={() => setConfirming(true)}>
              <svg width={20} height={20} viewBox={FILL_ICON_VIEWBOX} aria-hidden="true"><path d={FILL_ICON_PATHS["trash"]} fill="currentColor" /></svg>
            </button>
          </div>

          {confirming ? (
            <div className={cs.confirm} role="alertdialog" aria-labelledby="cart-confirm-title">
              <p className={cs.confirmTitle} id="cart-confirm-title">{t("confirmEmptyTitle")}</p>
              <div className={cs.confirmActions}>
                <Button
                  label={t("emptyCart")}
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    clearCart();
                    setConfirming(false);
                    setAnnounce("");
                  }}
                />
                <Button label={t("keepItems")} variant="outline" size="sm" onClick={() => setConfirming(false)} />
              </div>
            </div>
          ) : null}

          {signedIn ? <AddressCard locale={locale} state={address} /> : null}

          <section className={`${rx.card} ${rx.cardFlush}`} aria-label={t("itemsLabel")}>
            <ul className={cs.items}>
              {items.map((item) => {
                const image = allowedImageUrl(item.image);
                const priced = item.price > 0;
                const pack = packLine(item);
                return (
                  <li className={cs.item} key={item.id}>
                    <div className={cs.media}>
                      {image ? (
                        <CatalogImage src={image} alt="" sizes="64px" className={cs.mediaImage} />
                      ) : (
                        <FIcon icon="pill" tone={PHARMACY_TONE} size={44} />
                      )}
                    </div>
                    <div className={cs.info}>
                      {item.slug ? (
                        <Link className={cs.name} href={`/${locale}/p/${encodeURIComponent(item.slug)}`}>{item.name}</Link>
                      ) : (
                        <span className={cs.name}>{item.name}</span>
                      )}
                      {pack ? <span className={cs.sub}>{pack}</span> : null}
                      {item.rx ? <StatusChip label={t("needsRx")} tone="amber" /> : null}
                    </div>
                    <div className={cs.end}>
                      {priced ? <span className={cs.price}>{formatPrice(locale, item.price * item.qty).text}</span> : <span className={cs.noPrice}>{t("priceUnavailable")}</span>}
                      <Stepper
                        value={item.qty}
                        onChange={(next) => changeQty(item, next)}
                        min={0}
                        max={MAX_QTY}
                        label={t("quantity", { name: item.name })}
                        format={(n) => formatNumber(locale, n)}
                        decrementLabel={item.qty === 1 ? t("remove", { name: item.name }) : t("decrease", { name: item.name })}
                        incrementLabel={t("increase", { name: item.name })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {hasRxItems ? (
            <div className={rx.banner}>
              <FIcon icon="prescription" tone="amber" size={40} />
              <div className={rx.bannerBody}>
                <span className={rx.bannerTitle}>{t("rxBannerTitle")}</span>
                <span className={rx.bannerText}>{t("rxBannerBody")}</span>
              </div>
              <Link className={rx.bannerAction} href={upload}>{t("rxBannerAction")}</Link>
            </div>
          ) : null}
        </div>

        <div className={cs.side}>
          <section className={`${rx.card} ${cs.summary}`} aria-label={t("summaryLabel")}>
            <div className={cs.line}><span>{t("subtotal")}</span><span className={cs.lineValue}>{formatPrice(locale, subtotal).text}</span></div>
            <div className={cs.line}><span>{t("delivery")}</span><span className={cs.lineValue}>{t("deliveryFromOffer")}</span></div>
            <div className={`${cs.line} ${cs.totalLine}`}><span>{t("estimatedTotal")}</span><span className={cs.lineValue}>{formatPrice(locale, subtotal).text}</span></div>
            <p className={rx.note}>{missingPrice ? t("partialEstimate") : t("estimateNote")}</p>
            <div className={rx.deskActions}>{requestButton}</div>
          </section>
          <p className={`${rx.note} ${rx.noteCenter}`}>{t("flowNote")}</p>
          {saved}
        </div>
      </div>
    );
  }

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/c`} hideTabs footer={footer} width={ready && items.length > 0 ? "wide" : "narrow"}>
      <div className={rx.head}>
        <h1 className={rx.title}>{t("title")}</h1>
      </div>
      {body}
      <p role="status" className={rx.srOnly}>{announce}</p>
    </CoreShell>
  );
}
