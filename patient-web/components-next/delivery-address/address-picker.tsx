"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { OFFER_TONES } from "@/components-next/pharmacy-offers/tones";
import { formatAddressLine, hasLocation, pickDeliveryAddress, type DeliveryAddress } from "@/lib/pharmacy/delivery-address";
import { newIdempotencyKey } from "@/lib/pharmacy/broadcast";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./address-select.module.css";

/**
 * The patient's saved addresses as choices. The address a pharmacy request is sent with is the default one that has a
 * location (lib/pharmacy/delivery-address `pickDeliveryAddress`, the same helper the cart and checkout use), so choosing
 * an address here makes it the default (PATCH /users/me/addresses/:id with `is_default`), and the checkout then uses it.
 * An address without a location cannot be used for a pharmacy request, so it cannot be chosen; it says why.
 * Saving is single-flight, and the idempotency key is reused until the server has answered.
 */
export function AddressPicker({ locale, addresses }: { locale: string; addresses: DeliveryAddress[] }) {
  const t = useTranslations("DeliveryAddressSelect");
  const router = useRouter();
  const inUse = pickDeliveryAddress(addresses);
  const [selected, setSelected] = useState<string | null>(inUse?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const attempt = useRef<{ id: string; key: string } | null>(null);

  const leave = () => {
    router.refresh();
    if (window.history.length > 1) router.back();
    else router.push(`/${locale}/cart`);
  };

  const confirm = async () => {
    if (busy.current || !selected) return;
    if (selected === inUse?.id) return leave();
    busy.current = true;
    setSaving(true);
    setFailed(false);
    if (attempt.current?.id !== selected) attempt.current = { id: selected, key: newIdempotencyKey() };
    try {
      const response = await fetch(`/api/patient/users/me/addresses/${encodeURIComponent(selected)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "idempotency-key": attempt.current.key },
        body: JSON.stringify({ is_default: true }),
      });
      if (response.status === 401) return router.push(`/${locale}/login`);
      if (!response.ok) {
        // a refusal is final for this request; a server error may not have been applied, so the same key is tried again
        if (response.status < 500) attempt.current = null;
        return setFailed(true);
      }
      attempt.current = null;
      leave();
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <p className={rx.lead}>{t("lead")}</p>
      <ul className={styles.list} role="radiogroup" aria-label={t("listLabel")}>
        {addresses.map((address) => {
          const located = hasLocation(address);
          const line = formatAddressLine(address, locale);
          const on = selected === address.id;
          return (
            <li key={address.id}>
              <label className={`${styles.choice}${on ? ` ${styles.choiceOn}` : ""}${located ? "" : ` ${styles.choiceOff}`}`}>
                <input type="radio" name="delivery-address" checked={on} disabled={!located || saving} onChange={() => setSelected(address.id)} />
                <span className={styles.choiceText}>
                  <span className={styles.choiceTitle}>{address.label ?? (line || t("unnamed"))}</span>
                  {address.label && line ? <span className={styles.choiceLine}>{line}</span> : null}
                  <span className={styles.chips}>
                    {address.isDefault ? <StatusChip label={t("defaultChip")} tone={OFFER_TONES.good} /> : null}
                    {located ? null : <StatusChip label={t("noLocationChip")} tone={OFFER_TONES.warn} />}
                  </span>
                  {located ? null : <span className={styles.hint}>{t("noLocationHint")}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {failed ? <p className={styles.error} role="alert">{t("saveFailed")}</p> : null}
      <div className={styles.actions}>
        <Button label={t("confirm")} fullWidth disabled={!selected} loading={saving} onClick={confirm} />
        <ButtonLink href={`/${locale}/profile/addresses`} label={t("manage")} variant="outline" fullWidth />
      </div>
    </>
  );
}
