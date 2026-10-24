"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatRemaining } from "@/components-next/pharmacy-offers/format";
import styles from "./orders.module.css";

const INTERVAL_SECONDS = 30;


/**
 * While the order is still moving, ask the server again every 30 seconds (the page re-reads the order; nothing is kept
 * here) and offer a manual refresh. The status, the steps and the courier shown are only ever what the server returns.
 */
export function TrackingRefresh({ intervalSeconds = INTERVAL_SECONDS }: { intervalSeconds?: number } = {}) {
  const t = useTranslations("OrderTracking");
  const locale = useLocale();
  const router = useRouter();
  const [seconds, setSeconds] = useState(intervalSeconds);
  const left = useRef(intervalSeconds);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      left.current -= 1;
      if (left.current <= 0) {
        left.current = intervalSeconds;
        startTransition(() => router.refresh());
      }
      setSeconds(left.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className={styles.live}>
      {/* the countdown ticks every second: only the steady sentence is a live region */}
      <span><span role="status">{t("liveChecking")}</span><span aria-hidden="true"> · {t("nextCheck", { time: formatRemaining(locale, seconds * 1000) })}</span></span>
      <Button
        label={t("refreshNow")}
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => {
          left.current = intervalSeconds;
          setSeconds(intervalSeconds);
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}
