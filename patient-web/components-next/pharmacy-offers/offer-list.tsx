"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Radio, Segmented, StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { buildOfferSelectionRequest, type PharmacyCoverageMode } from "@/lib/api/pharmacy-actions";
import { formatKilometres, formatMinutes, formatMoney, formatRemaining, formatWhen } from "./format";
import { usePharmacyAction } from "./use-pharmacy-action";
import { OFFER_TONES } from "./tones";
import styles from "./offers.module.css";

/** One pharmacy's offer, as the page hands it over: the server's numbers, nothing derived. */
export type OfferView = {
  id: string;
  /** Only an open offer can be selected (the API lists the open ones). */
  open: boolean;
  pharmacyName?: string;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  currency?: string;
  preparationMinutes?: number;
  expiresAt?: string;
  insuranceReady?: boolean;
  codAllowed?: boolean;
  distanceKm?: number;
  note?: string;
  lines: Array<{ id: string; name: string; quantity?: number; unitPrice?: number; available?: boolean; alternative?: string }>;
};

export type SortKey = "price" | "fast" | "near";

/** Ascending by the chosen server value; an offer without that value goes last. The comparison never changes a number. */
export function sortOffers(offers: OfferView[], key: SortKey): OfferView[] {
  const value = (offer: OfferView) => (key === "price" ? offer.total : key === "fast" ? offer.preparationMinutes : offer.distanceKm);
  return [...offers].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === undefined && right === undefined) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left - right;
  });
}

/** The lowest total, but only among offers that can fill every line, and only when there is something to compare it with. */
export function lowestPriceIds(offers: OfferView[]): Set<string> {
  const complete = offers.filter((offer) => offer.total !== undefined && offer.lines.length > 0 && offer.lines.every((line) => line.available !== false));
  if (offers.length < 2 || complete.length === 0) return new Set();
  const lowest = Math.min(...complete.map((offer) => offer.total as number));
  return new Set(complete.filter((offer) => offer.total === lowest).map((offer) => offer.id));
}

type Props = {
  orderId: string;
  /** `refresh` stays on the page after a selection (the order's offers page); `tracking` goes to the order's tracking. */
  after: "refresh" | "tracking";
};

export function OfferList({ orderId, offers, after }: Props & { offers: OfferView[] }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("price");
  const [now, setNow] = useState<number | null>(null);
  const [modes, setModes] = useState<Record<string, PharmacyCoverageMode>>({});
  const action = usePharmacyAction();
  const [failedOffer, setFailedOffer] = useState<string | null>(null);

  // The countdown is the viewer's clock against the server's expiry; it only ever disables a button, the server decides.
  useEffect(() => {
    if (!offers.some((offer) => offer.expiresAt)) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [offers]);

  const expired = useCallback((offer: OfferView) => {
    if (now === null || !offer.expiresAt) return false;
    const at = new Date(offer.expiresAt).getTime();
    return !Number.isNaN(at) && at <= now;
  }, [now]);

  // An offer that has just expired is gone from the server's list: ask for the current one, once per expiry.
  const expiredKey = offers.filter(expired).map((offer) => offer.id).sort().join(",");
  useEffect(() => { if (expiredKey) router.refresh(); }, [expiredKey, router]);

  const lowest = useMemo(() => lowestPriceIds(offers), [offers]);
  const shown = useMemo(() => sortOffers(offers, sort), [offers, sort]);
  const hasFast = offers.some((offer) => offer.preparationMinutes !== undefined);
  const hasNear = offers.some((offer) => offer.distanceKm !== undefined);

  async function select(offer: OfferView) {
    const mode = modes[offer.id] ?? "cash";
    const request = buildOfferSelectionRequest(orderId, offer.id, mode);
    if (!request || action.pending) return;
    setFailedOffer(null);
    const result = await action.run(`select:${offer.id}:${mode}`, request.path, request.body);
    if (!result) return;
    if (!result.ok) { setFailedOffer(offer.id); return; }
    if (after === "tracking") router.replace(`/${locale}/orders/${encodeURIComponent(orderId)}/tracking?selectedOfferId=${encodeURIComponent(offer.id)}`);
    else router.refresh();
  }

  return (
    <>
      {offers.length > 1 ? (
        <div className={styles.sort}>
          <Segmented
            label={t("sortLabel")}
            size="sm"
            value={sort}
            onChange={(value) => setSort(value as SortKey)}
            options={[
              { value: "price", label: t("sortPrice") },
              { value: "fast", label: t("sortFast"), disabled: !hasFast },
              { value: "near", label: t("sortNear"), disabled: !hasNear },
            ]}
          />
        </div>
      ) : null}
      <ul className={styles.list} aria-label={t("offersTitle")}>
        {shown.map((offer) => {
          const gone = expired(offer);
          const unavailable = offer.lines.filter((line) => line.available === false).length;
          const allAvailable = offer.lines.length > 0 && unavailable === 0;
          const remaining = now !== null && offer.expiresAt ? new Date(offer.expiresAt).getTime() - now : null;
          // the absolute time is written by the browser, after mount, in the reader's own time zone (not on the server: see LocalTime)
          const until = now !== null && offer.expiresAt ? formatWhen(locale, offer.expiresAt) : null;
          const mode = modes[offer.id] ?? "cash";
          const selectable = offer.open && !gone && offer.total !== undefined;
          const meta = [
            offer.distanceKm !== undefined ? t("distanceAway", { distance: formatKilometres(locale, offer.distanceKm) }) : null,
            offer.preparationMinutes !== undefined ? t("ready", { time: formatMinutes(locale, offer.preparationMinutes) }) : null,
          ].filter((part): part is string => part !== null);
          return (
            <li key={offer.id} className={styles.offer}>
              <div className={styles.offerHead}>
                <FIcon icon="storefront" tone={OFFER_TONES.pharmacy} size={48} />
                <div className={styles.offerId}>
                  <h2 className={styles.pharmacy}>{offer.pharmacyName ?? t("pharmacyFallback")}</h2>
                  {meta.length ? <span className={styles.meta}>{meta.join(" · ")}</span> : null}
                </div>
                {lowest.has(offer.id) ? <StatusChip label={t("lowestPrice")} tone={OFFER_TONES.good} /> : null}
              </div>
              <div className={styles.chips}>
                {allAvailable ? <StatusChip label={t("allItems")} tone={OFFER_TONES.good} /> : null}
                {unavailable > 0 ? <StatusChip label={t("missingItems", { count: unavailable })} tone={OFFER_TONES.warn} /> : null}
                {offer.insuranceReady ? <StatusChip label={t("insuranceOk")} tone={OFFER_TONES.info} /> : null}
                {offer.codAllowed ? <StatusChip label={t("codOk")} tone={OFFER_TONES.cod} /> : null}
              </div>
              <div className={styles.priceRow}>
                {offer.total !== undefined ? (
                  <div className={styles.priceBox}>
                    <span className={styles.priceLabel}>{t("totalLabel")}</span>
                    <span className={styles.price}>{formatMoney(locale, offer.total, offer.currency)}</span>
                  </div>
                ) : null}
              </div>
              {gone ? (
                <p className={styles.expiredNote} role="status">{t("expired")}</p>
              ) : remaining !== null && remaining < 3_600_000 ? (
                <p className={styles.validity}>{t("validFor", { time: formatRemaining(locale, remaining) })}</p>
              ) : until ? (
                <p className={styles.validity}>{t("validUntil", { when: until })}</p>
              ) : null}
              {offer.lines.length > 0 || offer.subtotal !== undefined || offer.deliveryFee !== undefined || offer.note ? (
                <details className={styles.details}>
                  <summary>
                    <span className={styles.whenClosed}>{t("showDetails")}</span>
                    <span className={styles.whenOpen}>{t("hideDetails")}</span>
                  </summary>
                  {offer.lines.length > 0 ? (
                    <ul className={styles.lines}>
                      {offer.lines.map((line) => (
                        <li key={line.id} className={styles.line}>
                          <span className={styles.lineName}>
                            {line.name}
                            {line.quantity !== undefined && line.quantity > 0 ? ` ${t("lineQty", { qty: line.quantity })}` : ""}
                          </span>
                          <span className={`${styles.lineAmount} ${line.available === false ? styles.lineOut : ""}`}>
                            {line.available === false ? t("lineUnavailable") : line.unitPrice !== undefined ? formatMoney(locale, line.unitPrice, offer.currency) : ""}
                          </span>
                          {line.alternative ? <span className={styles.lineSub}>{t("lineAlternative", { name: line.alternative })}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {offer.subtotal !== undefined || offer.deliveryFee !== undefined || offer.total !== undefined ? (
                    <dl className={styles.sums}>
                      {offer.subtotal !== undefined ? <div className={styles.sum}><dt>{t("subtotalLabel")}</dt><dd>{formatMoney(locale, offer.subtotal, offer.currency)}</dd></div> : null}
                      {offer.deliveryFee !== undefined ? <div className={styles.sum}><dt>{t("deliveryLabel")}</dt><dd>{formatMoney(locale, offer.deliveryFee, offer.currency)}</dd></div> : null}
                      {offer.total !== undefined ? <div className={`${styles.sum} ${styles.sumTotal}`}><dt>{t("totalLabel")}</dt><dd>{formatMoney(locale, offer.total, offer.currency)}</dd></div> : null}
                    </dl>
                  ) : null}
                  {offer.note ? <p className={styles.note}><strong>{t("noteLabel")}</strong> {offer.note}</p> : null}
                </details>
              ) : null}
              {offer.open ? (
                <div className={styles.pick}>
                  {offer.insuranceReady ? (
                    <>
                      <p className={styles.pickLegend} id={`coverage-${offer.id}`}>{t("coverageLegend")}</p>
                      <div className={styles.pickGroup} role="radiogroup" aria-labelledby={`coverage-${offer.id}`}>
                        <Radio label={t("coverageCash")} selected={mode === "cash"} disabled={action.pending || gone} onChange={() => setModes((current) => ({ ...current, [offer.id]: "cash" }))} divider />
                        <Radio label={t("coverageInsurance")} selected={mode === "insurance"} disabled={action.pending || gone} onChange={() => setModes((current) => ({ ...current, [offer.id]: "insurance" }))} />
                      </div>
                    </>
                  ) : null}
                  <div className={styles.pickAction}>
                    <Button
                      label={action.pending && action.activeId?.startsWith(`select:${offer.id}:`) ? t("selecting") : t("selectOffer")}
                      size="lg"
                      fullWidth
                      loading={action.pending && action.activeId?.startsWith(`select:${offer.id}:`)}
                      disabled={!selectable || action.pending}
                      onClick={() => select(offer)}
                    />
                  </div>
                  <p className={styles.note}>{offer.total === undefined ? t("priceMissing") : t("selectNote")}</p>
                  {failedOffer === offer.id && action.error ? <p className={styles.errorText} role="alert">{t(`errors.${action.error}`)}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
