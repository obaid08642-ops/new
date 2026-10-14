"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import styles from "./service-booking-modal.module.css";

type Props = {
  locale: string;
  /** The label of the button that opens the window (the page passes its own translated text). */
  buttonLabel?: string;
  serviceName: string;
  /** Accepted, no longer used: nursing/catalog (Batch 4) still passes them from the old form. */
  serviceId?: string;
  servicePrice?: number;
  serviceType?: "lab" | "radiology" | "nursing";
  homeVisitSupported?: boolean;
};

/**
 * Still used by nursing/catalog (Batch 4 rebuilds that screen). It used to collect a form and then show a made-up booking
 * confirmation (a timer and a random reference): it never called a booking endpoint. It now says what is true: nothing is
 * booked from here, and sends the patient to the nursing page where a booking is really made.
 */
export function ServiceBookingModal({ locale, buttonLabel, serviceName }: Props) {
  const t = useTranslations("DiagWeb");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button label={buttonLabel ?? serviceName} size="sm" onClick={() => setOpen(true)} />
      {open ? (
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div ref={dialogRef} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="sbm-title" aria-describedby="sbm-body" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
            <h2 id="sbm-title" className={styles.title}>{t("bookingNotSentTitle")}</h2>
            <p id="sbm-body" className={styles.body}>{t("bookingNotSentBody")}</p>
            <div className={styles.actions}>
              <ButtonLink href={`/${locale}/nursing`} label={t("bookingNotSentCta")} size="md" fullWidth />
              <Button label={t("bookingNotSentClose")} variant="outline" size="md" fullWidth onClick={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
