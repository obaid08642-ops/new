"use client";

/**
 * The providers map (the ONLY providers-map file that imports MapLibre GL; the explorer loads it lazily, ssr: false).
 * Pins are drawn natively: a clustered GeoJSON source, a circle + count layer for clusters and a symbol layer whose images are
 * the hologram pins drawn once per kind from the tokens. Only the selected pin is a DOM marker (with the pulse ring).
 */
import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_ATTRIBUTION, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_LOCATED_ZOOM, MAP_STYLE_URL } from "@/lib/geo/map";
import { HOLO_CLUSTER, HOLO_KINDS, holoFeatures, holoKind, holoMotion, type HoloPoint } from "@/lib/map/hologram";
import { drawHologram } from "./hologram-draw";
import styles from "./provider-map.module.css";

const SRC = "providers";

export type ProviderMapProps = {
  providers: readonly (HoloPoint & { name: string })[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  focus: { lat: number; lng: number; seq: number } | null;
  onUnavailable: () => void;
  label: string;
  zoomIn: string;
  zoomOut: string;
};

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function addPinImages(map: MapLibreMap) {
  for (const kind of HOLO_KINDS) {
    const id = `holo-${kind}`;
    const c = document.createElement("canvas");
    drawHologram(c, kind, { ratio: 2 });
    const data = c.getContext("2d")?.getImageData(0, 0, c.width, c.height);
    if (!data) continue;
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, data, { pixelRatio: 2 });
  }
}

const MAP_START_DELAY_MS = 1500;

export default function ProviderMapCanvas({ providers, selectedId, onSelect, focus, onUnavailable, label, zoomIn, zoomOut }: ProviderMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const marker = useRef<Marker | null>(null);
  const fitted = useRef(false);
  const latest = useRef({ providers, onSelect, onUnavailable, focus });
  latest.current = { providers, onSelect, onUnavailable, focus };

  function paint() {
    const m = map.current;
    const src = m?.getSource(SRC) as GeoJSONSource | undefined;
    if (!m || !ready.current || !src) return;
    src.setData(holoFeatures(latest.current.providers));
    // a centre known before the map existed (position or saved address) wins over fitting to the pins
    if (!fitted.current && latest.current.providers.length > 0 && !latest.current.focus) {
      const pts = holoFeatures(latest.current.providers).features.map((f) => f.geometry.coordinates);
      if (pts.length > 1) {
        const lngs = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        m.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 13, duration: 0 });
        fitted.current = true;
      } else if (pts.length === 1) {
        m.jumpTo({ center: pts[0], zoom: 13 });
        fitted.current = true;
      }
    }
  }

  useEffect(() => {
    if (!host.current) return;
    // style, glyph and tile fetches start after the page settles, so the page reaches network idle first
    let teardown: (() => void) | undefined;
    const timer = window.setTimeout(() => { teardown = mount(); }, MAP_START_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      teardown?.();
    };
    // created once; labels only matter at creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mount(): (() => void) | undefined {
    if (!host.current) return;
    let live = true;
    let instance: MapLibreMap;
    try {
      instance = new MapLibreMap({
        container: host.current,
        style: MAP_STYLE_URL,
        center: latest.current.focus ? [latest.current.focus.lng, latest.current.focus.lat] : [MAP_DEFAULT_CENTER.lng, MAP_DEFAULT_CENTER.lat],
        zoom: latest.current.focus ? MAP_LOCATED_ZOOM - 3 : MAP_DEFAULT_ZOOM,
        dragRotate: false,
        pitchWithRotate: false,
        maxPitch: 0,
        attributionControl: { compact: false, customAttribution: MAP_ATTRIBUTION },
        locale: { "NavigationControl.ZoomIn": zoomIn, "NavigationControl.ZoomOut": zoomOut },
      });
    } catch {
      latest.current.onUnavailable();
      return;
    }
    map.current = instance;
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new NavigationControl({ showCompass: false }), "top-right");

    instance.on("load", () => {
      if (!live) return;
      addPinImages(instance);
      instance.addSource(SRC, { type: "geojson", data: holoFeatures([]), ...HOLO_CLUSTER });
      instance.addLayer({
        id: "clusters",
        type: "circle",
        source: SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": cssVar("--nabd-color-action-primary-bg"),
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 50, 28],
          "circle-stroke-width": 3,
          "circle-stroke-color": cssVar("--nabd-color-bg-surface"),
        },
      });
      instance.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 13, "text-allow-overlap": true },
        paint: { "text-color": cssVar("--nabd-color-action-primary-fg") },
      });
      instance.addLayer({
        id: "pins",
        type: "symbol",
        source: SRC,
        filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "id"], ""]],
        layout: { "icon-image": ["concat", "holo-", ["get", "kind"]], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true },
      });
      ready.current = true;
      paint();
      instance.on("click", "pins", (e) => {
        const f: MapGeoJSONFeature | undefined = e.features?.[0];
        if (f) latest.current.onSelect(String(f.properties.id));
      });
      instance.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const src = instance.getSource(SRC) as GeoJSONSource;
        try {
          const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id);
          const [lng, lat] = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
          instance.easeTo({ center: [lng, lat], zoom, duration: reduced() ? 0 : 400 });
        } catch { /* a cluster that vanished mid-click: nothing to do */ }
      });
      for (const layer of ["pins", "clusters"]) {
        instance.on("mouseenter", layer, () => { instance.getCanvas().style.cursor = "pointer"; });
        instance.on("mouseleave", layer, () => { instance.getCanvas().style.cursor = ""; });
      }
    });
    // a style that never arrives (blocked, offline) is "no map"
    instance.on("error", () => { if (live && !ready.current) latest.current.onUnavailable(); });

    // the theme changed: redraw the pin images from the new token values
    const redraw = () => { if (ready.current) addPinImages(instance); };
    const observer = new MutationObserver(redraw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const scheme = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
    scheme?.addEventListener("change", redraw);

    return () => {
      live = false;
      ready.current = false;
      observer.disconnect();
      scheme?.removeEventListener("change", redraw);
      marker.current?.remove();
      marker.current = null;
      map.current = null;
      instance.remove();
    };
  }

  useEffect(paint, [providers]);

  // the selected pin: the only DOM marker, with the pulse ring (CSS, off under reduced motion)
  useEffect(() => {
    const m = map.current;
    marker.current?.remove();
    marker.current = null;
    if (!m) return;
    const p = providers.find((x) => x.id === selectedId);
    if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return;
    const motion = holoMotion(reduced());
    const el = document.createElement("div");
    el.className = styles.selected;
    if (motion.pulse) {
      const ring = document.createElement("span");
      ring.className = styles.pulse;
      el.appendChild(ring);
    }
    const c = document.createElement("canvas");
    c.className = styles.selectedPin;
    drawHologram(c, holoKind(p.type), { selected: true, lifted: motion.lift, ratio: 2 });
    c.setAttribute("aria-hidden", "true");
    el.appendChild(c);
    const name = document.createElement("span");
    name.className = styles.selectedName;
    name.textContent = p.name;
    el.appendChild(name);
    marker.current = new Marker({ element: el, anchor: "bottom", offset: [0, -2] }).setLngLat([p.lng, p.lat]).addTo(m);
    m.easeTo({ center: [p.lng, p.lat], duration: motion.fly ? 400 : 0 });
  }, [selectedId, providers]);

  // the selected pin is the marker above, so the native layer skips it
  useEffect(() => {
    const m = map.current;
    if (m && ready.current && m.getLayer("pins")) m.setFilter("pins", ["all", ["!", ["has", "point_count"]], ["!=", ["get", "id"], selectedId ?? ""]]);
  }, [selectedId, providers]);

  useEffect(() => {
    if (!focus || !map.current) return;
    fitted.current = true;
    if (reduced()) map.current.jumpTo({ center: [focus.lng, focus.lat], zoom: MAP_LOCATED_ZOOM - 3 });
    else map.current.flyTo({ center: [focus.lng, focus.lat], zoom: MAP_LOCATED_ZOOM - 3, essential: true });
  }, [focus]);

  return <div ref={host} className={styles.map} role="group" aria-label={label} />;
}
