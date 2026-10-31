/**
 * The pure parts of the providers map page (`/map`): what a filter shows, the order of the bottom carousel, which card a swipe settled on,
 * where the map is centred, and which state the page is in. No React and no browser objects (the position and the saved address come in
 * as functions), so each rule is unit tested without a map.
 */
export type MapPoint = { lat: number; lng: number };

export type MapRow = { id: string; type: string; name: string; specialty?: string; lat?: number; lng?: number; distance_km?: number };

/** Riyadh: where the map opens when there is neither a position nor a saved address. */
export const DEFAULT_CENTRE: MapPoint = { lat: 24.7136, lng: 46.6753 };

const hasPoint = (p: { lat?: number; lng?: number }): p is { lat: number; lng: number } =>
  typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng);

/** The type chips and the search field. */
export function filterProviders<T extends MapRow>(rows: readonly T[], type: string, query: string): T[] {
  const text = query.trim().toLowerCase();
  return rows.filter((p) => (type === "all" || p.type === type) && (!text || p.name.toLowerCase().includes(text) || (p.specialty?.toLowerCase().includes(text) ?? false)));
}

/** Great-circle distance in km. */
export function haversineKm(a: MapPoint, b: MapPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The distance a card shows: from the centre when the provider has a position (the server's `distance_km` is not sent by the public read). */
export function distanceFrom(centre: MapPoint, p: MapRow): number | null {
  return hasPoint(p) ? haversineKm(centre, p) : null;
}

/** The carousel order: nearest first from the centre; providers without a position last; stable for equal distances. */
export function sortNearest<T extends MapRow>(rows: readonly T[], centre: MapPoint): T[] {
  return rows
    .map((p, i) => ({ p, i, d: distanceFrom(centre, p) ?? Number.POSITIVE_INFINITY }))
    .sort((x, y) => (x.d === y.d ? x.i - y.i : x.d - y.d))
    .map((x) => x.p);
}

export type CardRect = { id: string; x: number; width: number };

/**
 * The card a swipe settled on: the one whose middle is nearest the middle of the carousel. Works from measured rectangles, so it is the
 * same in a right-to-left page (where the scroll offset runs negative) as in a left-to-right one.
 */
export function nearestToCentre(cards: readonly CardRect[], viewport: { x: number; width: number }): string | null {
  const middle = viewport.x + viewport.width / 2;
  let best: string | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const c of cards) {
    const gap = Math.abs(c.x + c.width / 2 - middle);
    if (gap < bestGap) { best = c.id; bestGap = gap; }
  }
  return best;
}

export type CentreSource = "me" | "saved" | "default";
export type Centre = { point: MapPoint; source: CentreSource };

/**
 * Where the map is centred. The position is asked for only when the browser already allows it (never a prompt on page load);
 * without it the point of the patient's default saved address is used, and without that the default centre.
 */
export async function resolveCentre(deps: {
  permission: () => Promise<"granted" | "prompt" | "denied">;
  position: () => Promise<MapPoint | null>;
  saved: () => Promise<MapPoint | null>;
}): Promise<Centre> {
  try {
    if ((await deps.permission()) === "granted") {
      const here = await deps.position();
      if (here) return { point: here, source: "me" };
    }
  } catch { /* fall through to the saved address */ }
  try {
    const saved = await deps.saved();
    if (saved) return { point: saved, source: "saved" };
  } catch { /* fall through to the default */ }
  return { point: DEFAULT_CENTRE, source: "default" };
}

export type MapPhase = "loading" | "failed" | "empty" | "emptyFiltered" | "ready";

/** The page state. The map is drawn in every state; the phase only decides the card on top of it. */
export function mapPhase(input: { loading: boolean; failed: boolean; total: number; shown: number; filtered: boolean }): MapPhase {
  if (input.failed) return "failed";
  if (input.loading && input.total === 0) return "loading";
  if (input.shown > 0) return "ready";
  return input.total > 0 && input.filtered ? "emptyFiltered" : "empty";
}

/** Only providers with a real position can be pins. */
export const locatable = <T extends MapRow>(rows: readonly T[]): T[] => rows.filter(hasPoint);
