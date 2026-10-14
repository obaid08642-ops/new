"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { browserCoords, resolveNearbyPlace, savedAddressCity } from "@/lib/consult/doctor-filters";
import styles from "./consult.module.css";

type Props = {
  /** The page link that turns "Available now" on, or off when it is on. */
  availableHref: string;
  availableOn: boolean;
  /** The page link that turns "Nearest" off (shown when it is on). */
  nearestOffHref: string;
  /** The page query that turns "Nearest" on, without the place; the place found on tap is appended. */
  nearestOnBase: string;
  nearestOn: boolean;
  /** "Nearest" never applies to video. */
  nearestBlocked: boolean;
  /** The city a city-based "Nearest" used, to say so. */
  nearestCity?: string;
};

/**
 * The two quick filters of the doctors page. "Available now" is a link (works before the page is interactive). "Nearest"
 * asks for the browser location only when it is tapped, never on load; when the location is denied or unavailable it
 * falls back to the city of the saved address, and says so when neither exists.
 */
export function DoctorQuickFilters({ availableHref, availableOn, nearestOffHref, nearestOnBase, nearestOn, nearestBlocked, nearestCity }: Props) {
  const t = useTranslations("Doctors");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "none">("idle");

  async function turnNearestOn() {
    setState("locating");
    const place = await resolveNearbyPlace({ deviceCoords: () => browserCoords(), savedCity: () => savedAddressCity() });
    if (!place) return setState("none");
    setState("idle");
    const extra = place.kind === "coords" ? `lat=${encodeURIComponent(String(place.lat))}&lng=${encodeURIComponent(String(place.lng))}` : `city=${encodeURIComponent(place.city)}`;
    router.replace(`${nearestOnBase}${nearestOnBase.includes("?") ? "&" : "?"}${extra}`);
  }

  return (
    <div role="group" aria-label={t("quick")}>
      <div className={styles.quick}>
        {nearestOn ? (
          <Link className={styles.quickChip} href={nearestOffHref} aria-current="true" replace>{t("nearest")}</Link>
        ) : (
          <button
            type="button"
            className={styles.quickChip}
            aria-pressed="false"
            disabled={nearestBlocked || state === "locating"}
            onClick={() => void turnNearestOn()}
          >
            {t("nearest")}
          </button>
        )}
        <Link className={styles.quickChip} href={availableHref} aria-current={availableOn ? "true" : undefined} replace>{t("availableNow")}</Link>
      </div>
      <p className={styles.quickNote} role="status">
        {nearestBlocked ? t("nearestOnline") : state === "locating" ? t("locating") : state === "none" ? t("nearestNoPlace") : nearestOn && nearestCity ? t("nearestCity", { city: nearestCity }) : ""}
      </p>
    </div>
  );
}
