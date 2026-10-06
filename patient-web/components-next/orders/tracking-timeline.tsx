"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Timeline } from "@/components-next/ui-generated/components/Cards";
import { formatWhen } from "@/components-next/pharmacy-offers/format";
import type { TrackingStep } from "@/lib/pharmacy/order-view";

const LABEL_KEYS = { accepted: "stepAccepted", preparing: "stepPreparing", onTheWay: "stepOnTheWay", delivered: "stepDelivered", pickedUp: "stepPickedUp" } as const;

/**
 * canvas/OrderTracking's steps. Which step an order is at, and when each was reached, are the server's (the order's
 * status and its logged events). The time is written after the page is on screen, in the reader's own time zone: done
 * on the server it would be the server's zone and Node's date data differs from the browser's (see LocalTime).
 */
export function TrackingTimeline({ locale, steps }: { locale: string; steps: TrackingStep[] }) {
  const t = useTranslations("OrderTracking");
  const [times, setTimes] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const step of steps) {
      const text = step.at ? formatWhen(locale, step.at) : null;
      if (text) next[step.id] = text;
    }
    setTimes(next);
  }, [steps, locale]);
  return (
    <Timeline
      label={t("timelineLabel")}
      steps={steps.map((step) => ({ id: step.id, label: t(LABEL_KEYS[step.id]), time: times[step.id], state: step.state }))}
    />
  );
}
