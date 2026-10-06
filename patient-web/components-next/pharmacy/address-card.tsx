"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Skeleton } from "@/components-next/ui-generated/components/Feedback";
import { formatAddressLine } from "@/lib/pharmacy/delivery-address";
import type { AddressState } from "./use-delivery-address";
import { PHARMACY_TONE } from "./tones";
import styles from "./rx.module.css";

/** Where the saved addresses are managed. */
const ADDRESSES = "profile/addresses";

/**
 * "Deliver to [saved address] Change" of canvas/Cart, for every screen that sends a request to the pharmacies.
 * It draws what the address list really holds: the address the request would use, or why there is none. Nothing is guessed.
 */
export function AddressCard({ locale, state }: { locale: string; state: AddressState }) {
  const t = useTranslations("PharmacyAddress");
  const pin = <FIcon icon="map-pin" tone={PHARMACY_TONE} size={40} />;

  if (state.status === "unauthenticated") return null;

  if (state.status === "loading") {
    return (
      <section className={styles.card} aria-busy="true" aria-label={t("loading")}>
        <div className={styles.cardRow}>
          {pin}
          <div className={styles.cardBody}><Skeleton variant="text" lines={2} /></div>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return <p role="status" className={styles.note}>{t("unavailable")}</p>;
  }

  if (state.status === "ready") {
    const { address } = state;
    const line = formatAddressLine(address, locale);
    return (
      <section className={styles.card} aria-label={t("deliverTo")}>
        <div className={styles.cardRow}>
          {pin}
          <div className={styles.cardBody}>
            <span className={styles.cardLabel}>{t("deliverTo")}</span>
            <span className={styles.cardValue}>{address.label ?? line}</span>
            {address.label && line ? <span className={styles.cardLabel}>{line}</span> : null}
          </div>
          <Link className={styles.cardLink} href={`/${locale}/${ADDRESSES}`}>{t("change")}</Link>
        </div>
      </section>
    );
  }

  const noLocation = state.status === "nolocation";
  return (
    <section className={styles.card} aria-label={t("deliverTo")}>
      <div className={styles.cardRow}>
        {pin}
        <div className={styles.cardBody}>
          <span className={styles.cardValue}>{noLocation ? t("noLocationTitle") : t("addTitle")}</span>
          <span className={styles.cardLabel}>{t("addBody")}</span>
        </div>
        <Link className={styles.cardLink} href={`/${locale}/${ADDRESSES}`}>{noLocation ? t("change") : t("manage")}</Link>
      </div>
    </section>
  );
}
