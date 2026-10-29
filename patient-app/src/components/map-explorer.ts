/**
 * The pure parts of the providers map screen (`/map`): which providers a filter shows, how the bottom carousel is ordered, which card a
 * swipe settled on, where the map is centred, and which state the screen is in. No React, no native modules, so each rule is unit tested.
 */
export interface Point { lat: number; lng: number }

export interface MapRow {
  id: string;
  kind: string;
  name: string;
  specialties: string[];
  lat: number | null;
  lng: number | null;
  distance: number | null;
}

/** Riyadh: where the map opens when the phone gives no position and there is no saved address (the map has to open somewhere). */
export const DEFAULT_CENTRE: Point = { lat: 24.7136, lng: 46.6753 };

/** The type chips and the search field. A provider matches when its kind is the chosen one (or "all") and the text is in its name or a specialty. */
export function filterProviders<T extends MapRow>(rows: readonly T[], kind: string, query: string): T[] {
  const text = query.trim().toLowerCase();
  return rows.filter((p) => (kind === 'all' || p.kind === kind) && (!text || p.name.toLowerCase().includes(text) || p.specialties.some((s) => s.toLowerCase().includes(text))));
}

/** Great-circle distance in km. */
export function haversineKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The carousel order: nearest first, measured from the centre of the map; providers with no position go last. Stable for equal distances. */
export function sortNearest<T extends MapRow>(rows: readonly T[], centre: Point): T[] {
  const dist = (p: T): number => (p.lat !== null && p.lng !== null ? haversineKm(centre, { lat: p.lat, lng: p.lng }) : Number.POSITIVE_INFINITY);
  return rows.map((p, i) => ({ p, i, d: dist(p) })).sort((x, y) => (x.d === y.d ? x.i - y.i : x.d - y.d)).map((x) => x.p);
}

/** The width of a carousel card: a bit under three quarters of the screen, so the next card peeks and at most one card is mostly visible. */
export function cardWidth(screenWidth: number): number {
  return Math.round(Math.min(Math.max(screenWidth * 0.72, 220), 320));
}

export interface ViewableItem { key: string; isViewable: boolean }

/** The card a swipe settled on: the single viewable one. Nothing (null) while two cards share the screen, so the map does not jump on a half swipe. */
export function pickViewable(items: readonly ViewableItem[]): string | null {
  const on = items.filter((i) => i.isViewable);
  return on.length === 1 ? on[0].key : null;
}

export type CentreSource = 'me' | 'saved' | 'default';

/** Where the map is centred: the phone's position, else the point of the patient's selected (or default) saved address, else the default. */
export function resolveCentre(position: Point | null, saved: Point | null): { point: Point; source: CentreSource } {
  if (position) return { point: position, source: 'me' };
  if (saved) return { point: saved, source: 'saved' };
  return { point: DEFAULT_CENTRE, source: 'default' };
}

/** A saved address's point, only when both numbers are real. */
export function savedPoint(address: { lat?: unknown; lng?: unknown } | null | undefined): Point | null {
  const lat = address?.lat;
  const lng = address?.lng;
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export type MapPhase = 'loading' | 'failed' | 'empty' | 'emptyFiltered' | 'ready';

/** The screen state. The map itself is drawn in every one of them; the phase only decides the card on top of it. */
export function mapPhase(input: { loading: boolean; failed: boolean; total: number; shown: number; filtered: boolean }): MapPhase {
  if (input.failed) return 'failed';
  if (input.loading && input.total === 0) return 'loading';
  if (input.shown > 0) return 'ready';
  return input.total > 0 && input.filtered ? 'emptyFiltered' : 'empty';
}
