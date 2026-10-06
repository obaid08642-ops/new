"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatRemaining } from "@/components-next/pharmacy-offers/format";
import styles from "./checkout.module.css";

const INTERVAL_SECONDS = 15;

/**
 * While the insurer has not decided, ask the server again every 15 seconds (the page re-reads the order; nothing is
 * kept here) and offer a manual refresh. The decision itself is only ever what the server returns.
 */
export function InsuranceStatusRefresh() {
  const t = useTranslations("PharmacyCheckout");
  const locale = useLocale();
  const router = useRouter();
  const [seconds, setSeconds] = useState(INTERVAL_SECONDS);
  const left = useRef(INTERVAL_SECONDS);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      left.current -= 1;
      if (left.current <= 0) {
        left.current = INTERVAL_SECONDS;
        startTransition(() => router.refresh());
      }
      setSeconds(left.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className={styles.statusLine}>
      {/* the countdown ticks every second: only the steady sentence is a live region */}
      <span><span role="status">{t("insuranceChecking")}</span><span aria-hidden="true"> · {t("nextCheck", { time: formatRemaining(locale, seconds * 1000) })}</span></span>
      <Button
        label={t("refreshNow")}
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => {
          left.current = INTERVAL_SECONDS;
          setSeconds(INTERVAL_SECONDS);
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}
