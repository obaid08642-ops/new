"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Toast } from "@/components-next/ui-generated/components/Feedback";
import { formatLastUpdated, getOnlineSnapshot, getServerOnlineSnapshot, subscribeOnline, validRenderedAt } from "@/lib/network/offline-status";

/** The banner itself, without the browser: what it shows for a given state (tests render this). */
export function OfflineBannerView({ online, message }: { online: boolean; message: string }) {
  if (online) return null;
  return <Toast message={message} tone="warning" testID="offline-banner" />;
}

/**
 * P15.4: when the browser goes offline, the page stays as it is (the content already on screen is the cached copy) and
 * this banner says so, with the time that copy was made by the server ("last updated"). It disappears as soon as the
 * browser is back online. Not on the service worker's own offline page (journeys 77), which already says it.
 *
 * `renderedAt` is the locale layout's render time (lib/network/offline-status.ts says why that is the honest time).
 */
export function OfflineBanner({ renderedAt }: { renderedAt: number }) {
  const t = useTranslations("Network");
  const locale = useLocale();
  const pathname = usePathname();
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  // The clock is read in the browser only, when the banner is needed (the server render has no banner).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!online) setNow(Date.now());
  }, [online]);

  if (online || /^\/[a-z]{2,3}\/offline\/?$/.test(pathname ?? "")) return null;
  const at = now === null ? null : validRenderedAt(renderedAt, now);
  const message = at === null || now === null ? t("offline") : t("offlineLastUpdated", { time: formatLastUpdated(locale, at, now) });
  return <OfflineBannerView online={false} message={message} />;
}
