import type { ServiceTone } from '../../../packages/ui-native/src';
import { SERVICE_ICONS } from '../../../packages/ui/icons/fill';

/**
 * Pure helpers of the hologram provider pins (map screen + MapPrimitives): which tone and base shape a provider kind gets, the GeoJSON
 * the native layers draw, the clustering setup and the reduced-motion switch. No colours here: tones come from the design tokens.
 */
export type HoloKind = 'doctor' | 'hospital' | 'pharmacy' | 'lab' | 'radiology' | 'nursing';
export const HOLO_KINDS: readonly HoloKind[] = ['hospital', 'doctor', 'pharmacy', 'lab', 'radiology', 'nursing'];
export type HoloShape = 'square' | 'circle' | 'rectangle' | 'diamond' | 'rounded';

/** Kind -> service tone (the 10 tones of the tokens, the same the service map assigns) and the base platform shape of the first hologram. */
export const HOLO_LOOK: Record<HoloKind, { tone: ServiceTone; shape: HoloShape }> = {
  hospital: { tone: 'peach', shape: 'square' },
  doctor: { tone: SERVICE_ICONS.consult.tone, shape: 'circle' },
  pharmacy: { tone: SERVICE_ICONS.pharmacy.tone, shape: 'rectangle' },
  lab: { tone: SERVICE_ICONS.lab.tone, shape: 'diamond' },
  radiology: { tone: SERVICE_ICONS.radiology.tone, shape: 'diamond' },
  nursing: { tone: SERVICE_ICONS.nursing.tone, shape: 'rounded' },
};

export const isHoloKind = (raw: unknown): raw is HoloKind => (HOLO_KINDS as readonly unknown[]).includes(raw);

/** Past this many pins the native layers draw them; the React markers are only for the selected one. */
export const CLUSTER = { radius: 48, maxZoom: 14 } as const;

export interface HoloPoint { id: string; kind: HoloKind; lat: number | null; lng: number | null }

export interface HoloFeatureCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; id: string; properties: { id: string; kind: HoloKind }; geometry: { type: 'Point'; coordinates: [number, number] } }[];
}

/** The pins that have a position, as GeoJSON (the server gave the position; nothing is invented). */
export function toFeatureCollection(points: readonly HoloPoint[]): HoloFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points
      .filter((p): p is HoloPoint & { lat: number; lng: number } => p.lat !== null && p.lng !== null)
      .map((p) => ({ type: 'Feature', id: p.id, properties: { id: p.id, kind: p.kind }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
  };
}

/** A MapLibre `match` expression on the feature's kind: one value per kind. */
export function matchByKind<T extends string | number>(values: Record<HoloKind, T>, fallback: T): unknown[] {
  const expr: unknown[] = ['match', ['get', 'kind']];
  for (const kind of HOLO_KINDS) expr.push(kind, values[kind]);
  expr.push(fallback);
  return expr;
}

/** Motion of the pins: none (no pulse, no lift) when the reader asked for reduced motion. */
export function holoMotion(reduceMotion: boolean): { pulse: boolean; lift: boolean } {
  return { pulse: !reduceMotion, lift: !reduceMotion };
}
