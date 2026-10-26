"use client";

/**
 * The ONLY file that imports MapLibre GL (the address pages load it lazily through next/dynamic, ssr: false; no other page
 * may import it). The pin is fixed in the middle of the map; moving the map moves the pin, and `onMoveEnd` reports the
 * centre once the map has stopped. Arrow keys move the pin, + and - zoom (the library's own keyboard handler is off so the
 * keys are handled once, here).
 */
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import type { AddressPoint } from "@/lib/account/address-form";
import { MAP_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_STYLE_URL, nudgeFor } from "@/lib/geo/map";
import styles from "./address-map.module.css";

export type MapFocus = { point: AddressPoint; zoom: number; seq: number };

export type MapCanvasProps = {
  /** Where the map opens (the pin, once there is one, else Riyadh). */
  initial: AddressPoint | null;
  /** A new target to fly to (the patient's own position); a higher `seq` is a new request. */
  focus: MapFocus | null;
  onMoveEnd: (point: AddressPoint) => void;
  /** The style or the library could not start: the picker shows the "no map available" state. */
  onUnavailable: () => void;
  label: string;
  hint: string;
  zoomIn: string;
  zoomOut: string;
  pinLabel: string;
  /** A place to look at, not to choose: the map does not move (the facility page), so the pin stays on the place. */
  fixed?: boolean;
  zoom?: number;
};

export default function MapCanvas({ initial, focus, onMoveEnd, onUnavailable, label, hint, zoomIn, zoomOut, pinLabel, fixed = false, zoom }: MapCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const callbacks = useRef({ onMoveEnd, onUnavailable });
  callbacks.current = { onMoveEnd, onUnavailable };
  const hintId = useId();
  const start = initial ?? MAP_DEFAULT_CENTER;

  useEffect(() => {
    if (!host.current) return;
    let live = true;
    let loaded = false;
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container: host.current,
        style: MAP_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: zoom ?? MAP_DEFAULT_ZOOM,
        interactive: !fixed,
        keyboard: false,
        dragRotate: false,
        pitchWithRotate: false,
        maxPitch: 0,
        attributionControl: { compact: false, customAttribution: MAP_ATTRIBUTION },
        locale: { "NavigationControl.ZoomIn": zoomIn, "NavigationControl.ZoomOut": zoomOut },
      });
    } catch {
      callbacks.current.onUnavailable();
      return;
    }
    map.current = instance;
    instance.touchZoomRotate.disableRotation();
    if (!fixed) instance.addControl(new NavigationControl({ showCompass: false }), "top-right");
    instance.on("load", () => { loaded = true; });
    // a style that never arrives (blocked, offline) is "no map"; a missed tile later is not
    instance.on("error", () => { if (live && !loaded) callbacks.current.onUnavailable(); });
    instance.on("moveend", () => {
      if (!live) return;
      const c = instance.getCenter();
      callbacks.current.onMoveEnd({ lat: c.lat, lng: c.lng });
    });
    return () => {
      live = false;
      map.current = null;
      instance.remove();
    };
    // the map is created once; labels only matter at creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (focus && map.current) map.current.flyTo({ center: [focus.point.lng, focus.point.lat], zoom: focus.zoom, essential: true });
  }, [focus]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const m = map.current;
    if (!m || event.altKey || event.ctrlKey || event.metaKey) return;
    const action = nudgeFor(event.key, event.shiftKey);
    if (!action) return;
    event.preventDefault();
    if (action.kind === "pan") m.panBy([action.dx, action.dy], { duration: 150 });
    else if (action.delta > 0) m.zoomIn({ duration: 150 });
    else m.zoomOut({ duration: 150 });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.frame}>
      <div ref={host} className={styles.map} role="group" aria-label={label} aria-describedby={hint ? hintId : undefined} tabIndex={fixed ? undefined : 0} onKeyDown={onKeyDown} />
      <span className={styles.pin} role="img" aria-label={pinLabel}>
        <FIcon icon="map-pin" tone={SERVICE_ICONS.pharmacy.tone} size={44} />
      </span>
      </div>
      {hint ? <p id={hintId} className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
