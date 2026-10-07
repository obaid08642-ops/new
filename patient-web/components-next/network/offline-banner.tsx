"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getOnlineSnapshot, subscribeOnline } from "@/lib/api/net/online";
import { hydrateLastSync, subscribeLastSync } from "@/lib/api/net/last-sync";

/**
 * P15.4 — cached data stays visible offline, with an "offline" banner and a
 * "last updated" time.
 *
 * The banner only appears when the browser reports offline; the timestamp comes
 * from the network layer's last settled response (15.1), persisted across
 * reloads, so "last updated" survives the exact situation it describes.
 */
export function OfflineBanner() {
  const locale = useLocale();
  const t = useTranslations("Network");
  // The server snapshot reads the same function: on real SSR there is no
  // navigator, so it deterministically reports online (no banner), exactly
  // like `() => true` did — but tests can drive it through the mock.
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineSnapshot);
  // Seeded once from persisted storage, then kept fresh by the store.
  const [syncedAt, setSyncedAt] = useState<number | null>(() => hydrateLastSync());
  useEffect(() => subscribeLastSync(setSyncedAt), []);

  if (online) return null;
  const when =
    syncedAt === null
      ? null
      : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(syncedAt));

  return (
    <div
      role="status"
      style={{
        background: "#3D2E1F",
        color: "#FFE9C7",
        padding: "10px 16px",
        display: "flex",
        gap: 8,
        alignItems: "baseline",
        justifyContent: "center",
        flexWrap: "wrap",
        fontSize: ".85rem",
      }}
    >
      <strong>{t("banner.offline")}</strong>
      {when ? (
        <span>
          {t("lastUpdated")}: <time dateTime={new Date(syncedAt as number).toISOString()}>{when}</time>
        </span>
      ) : null}
    </div>
  );
}
