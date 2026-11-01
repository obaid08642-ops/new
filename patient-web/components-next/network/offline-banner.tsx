"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatLastUpdated, getOnlineSnapshot, getServerOnlineSnapshot, subscribeOnline, validRenderedAt } from "@/lib/network/offline-status";

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
  // The Toast (and the icon outlines behind it) is fetched only once the browser is actually offline: a plain import() in an effect,
  // not the framework's lazy loader, which preloads its chunk on every page.
  const [View, setView] = useState<null | typeof import("./offline-banner-view").OfflineBannerView>(null);
  useEffect(() => {
    if (online) return;
    let live = true;
    import("./offline-banner-view").then((m) => { if (live) setView(() => m.OfflineBannerView); }).catch(() => undefined);
    return () => { live = false; };
  }, [online]);

  if (online || /^\/[a-z]{2,3}\/offline\/?$/.test(pathname ?? "")) return null;
  const at = now === null ? null : validRenderedAt(renderedAt, now);
  const message = at === null || now === null ? t("offline") : t("offlineLastUpdated", { time: formatLastUpdated(locale, at, now) });
  return View ? <View online={false} message={message} /> : null;
}
