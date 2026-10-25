"use client";

/**
 * "Pick the address on the map" (owner item 4): the map first, a pin that follows the map, "use my location", and the state of
 * the address lookup. MapLibre GL is loaded only here, lazily and only in the browser (next/dynamic, ssr: false); where WebGL
 * or the tile server is not available the same controls stay and a "no map available" box takes the map's place.
 * The form below this component keeps every field, so nothing depends on the map.
 */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { AddressPoint } from "@/lib/account/address-form";
import { pointFromPosition } from "@/lib/account/address-form";
import { formatPoint, MAP_LOCATED_ZOOM, webglAvailable } from "@/lib/geo/map";
import type { ReverseState } from "@/lib/geo/reverse";
import type { MapFocus } from "./map-canvas";
import styles from "./address-map.module.css";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false, loading: () => <div className={styles.frame} aria-busy="true" /> });

type Support = "checking" | "yes" | "no";
type Locate = "idle" | "locating" | "set" | "denied" | "failed";

export function AddressMap({ point, onPoint, reverse, onRetry, locale }: { point: AddressPoint | null; onPoint: (next: AddressPoint) => void; reverse: ReverseState; onRetry: () => void; locale: string }) {
  const t = useTranslations("AddressMap");
  const [support, setSupport] = useState<Support>("checking");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locate, setLocate] = useState<Locate>("idle");

  useEffect(() => { setSupport(webglAvailable() ? "yes" : "no"); }, []);

  /** The browser asks for permission; a refusal (code 1) and any other failure are told apart. */
  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return setLocate("failed");
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = pointFromPosition(position.coords.latitude, position.coords.longitude);
        if (!next) return setLocate("failed");
        setLocate("set");
        onPoint(next);
        setFocus({ point: next, zoom: MAP_LOCATED_ZOOM, seq: (focus?.seq ?? 0) + 1 });
      },
      (error) => setLocate(error.code === 1 ? "denied" : "failed"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const failure = reverse.status === "error" ? reverse.reason : null;
  const errorKey = failure === "outside" ? "errOutside" : failure === "notFound" ? "errNotFound" : failure === "network" ? "errNetwork" : "errUnavailable";

  return (
    <div className={styles.stack}>
      <h2 className={styles.noMapTitle}>{t("title")}</h2>
      {support === "yes" ? (
        <MapCanvas
          initial={point}
          focus={focus}
          onMoveEnd={onPoint}
          onUnavailable={() => setSupport("no")}
          label={t("mapLabel")}
          hint={t("hint")}
          zoomIn={t("zoomIn")}
          zoomOut={t("zoomOut")}
          pinLabel={t("pinLabel")}
        />
      ) : support === "no" ? (
        <div className={styles.noMap} role="status">
          <p className={styles.noMapTitle}>{t("noMapTitle")}</p>
          <p className={styles.hint}>{t("noMapBody")}</p>
        </div>
      ) : (
        <div className={styles.frame} aria-busy="true"><p className={styles.hint}>{t("loading")}</p></div>
      )}
      <Button label={locate === "locating" ? t("locating") : t("useMyLocation")} variant="outline" size="sm" loading={locate === "locating"} disabled={locate === "locating"} onClick={useMyLocation} />
      {locate === "set" ? <p className={styles.statusOk} role="status">{t("located")}</p> : null}
      {locate === "denied" ? <p className={styles.statusError} role="alert">{t("denied")}</p> : null}
      {locate === "failed" ? <p className={styles.statusError} role="alert">{t("locateFailed")}</p> : null}
      <p className={styles.coords} aria-live="polite">{point ? t("coords", { point: formatPoint(point, locale) }) : t("noPin")}</p>
      {point && reverse.status === "loading" ? <p className={styles.status} role="status">{t("finding")}</p> : null}
      {point && reverse.status === "ok" ? <p className={styles.statusOk} role="status">{t("found")}</p> : null}
      {point && reverse.status === "error" ? (
        <>
          <p className={styles.statusError} role="alert">{t(errorKey)}</p>
          {failure === "outside" ? null : <Button label={t("retry")} variant="outline" size="sm" onClick={onRetry} />}
        </>
      ) : null}
    </div>
  );
}
