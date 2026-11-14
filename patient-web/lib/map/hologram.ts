/**
 * The hologram provider pins: the pure parts (which tone, which base shape and glyph a kind has, the cluster settings, what
 * motion is allowed, the GeoJSON). No colour is written here: a kind names a service TONE, and the canvas that draws the pin
 * reads the tone's CSS variable (`--nabd-color-service-<tone>-*`) from the page, so light and dark both follow the tokens.
 */
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";

export type HoloKind = "doctor" | "hospital" | "pharmacy" | "lab" | "radiology" | "nursing";
export type HoloShape = "square" | "circle" | "rect" | "diamond" | "rounded";

export const HOLO_KINDS: readonly HoloKind[] = ["pharmacy", "doctor", "lab", "radiology", "nursing", "hospital"];

/** Per kind: the service tone, the base platform shape (as on the first app map) and the glyph. Tones are the handoff service map's. */
export const HOLO_STYLE: Record<HoloKind, { tone: ServiceTone; shape: HoloShape; icon: FillIconName }> = {
  hospital: { tone: SERVICE_ICONS.radiology.tone, shape: "square", icon: "hospital" },
  doctor: { tone: SERVICE_ICONS.consult.tone, shape: "circle", icon: SERVICE_ICONS.consult.icon },
  pharmacy: { tone: SERVICE_ICONS.pharmacy.tone, shape: "rect", icon: SERVICE_ICONS.pharmacy.icon },
  lab: { tone: SERVICE_ICONS.lab.tone, shape: "diamond", icon: SERVICE_ICONS.lab.icon },
  radiology: { tone: SERVICE_ICONS.radiology.tone, shape: "diamond", icon: SERVICE_ICONS.radiology.icon },
  nursing: { tone: SERVICE_ICONS.nursing.tone, shape: "rounded", icon: SERVICE_ICONS.nursing.icon },
};

export function holoKind(raw: unknown): HoloKind {
  return typeof raw === "string" && raw in HOLO_STYLE ? (raw as HoloKind) : "doctor";
}
export const holoTone = (kind: HoloKind): ServiceTone => HOLO_STYLE[kind].tone;
export const holoShape = (kind: HoloKind): HoloShape => HOLO_STYLE[kind].shape;

/** MapLibre cluster source settings: pins merge when zoomed out, and open up at street level. */
export const HOLO_CLUSTER = { cluster: true, clusterRadius: 48, clusterMaxZoom: 14 } as const;

/** Reduced motion: no pulse ring, no lift, and the map jumps instead of flying. */
export function holoMotion(reducedMotion: boolean): { pulse: boolean; lift: boolean; fly: boolean } {
  return { pulse: !reducedMotion, lift: !reducedMotion, fly: !reducedMotion };
}

export type HoloPoint = { id: string; type: string; lat?: number; lng?: number };

export type HoloFeatureCollection = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: { id: string; kind: HoloKind }; geometry: { type: "Point"; coordinates: [number, number] } }[];
};

/** The source data: only providers with a real position; nothing is invented for the rest. */
export function holoFeatures(providers: readonly HoloPoint[]): HoloFeatureCollection {
  const features: HoloFeatureCollection["features"] = [];
  for (const p of providers) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number" || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    features.push({ type: "Feature", properties: { id: p.id, kind: holoKind(p.type) }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
  }
  return { type: "FeatureCollection", features };
}
