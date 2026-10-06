"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatRemaining } from "./format";
import styles from "./offers.module.css";

const INTERVAL_SECONDS = 15;

/**
 * While no offer has arrived, ask the server again every 15 seconds (the page re-reads the offers; nothing is kept
 * here), and offer a manual refresh. It draws nothing once there is something to show or the order is closed.
 */
export function OffersLiveRefresh({ active }: { active: boolean }) {
  const t = useTranslations("PharmacyOffers");
  const locale = useLocale();
  const router = useRouter();
  const [seconds, setSeconds] = useState(INTERVAL_SECONDS);
  const left = useRef(INTERVAL_SECONDS);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      left.current -= 1;
      if (left.current <= 0) {
        left.current = INTERVAL_SECONDS;
        startTransition(() => router.refresh());
      }
      setSeconds(left.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  if (!active) return null;
  return (
    <div className={styles.live}>
      {/* the countdown ticks every second: only the steady sentence is a live region, so a screen reader is not flooded */}
      <span><span role="status">{t("liveChecking")}</span><span aria-hidden="true"> · {t("liveNext", { time: formatRemaining(locale, seconds * 1000) })}</span></span>
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
