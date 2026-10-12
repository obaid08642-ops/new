import { GeoEngineService, LatLng } from './geo-engine.service';

const geo = new GeoEngineService();

/**
 * #623: order catalogue items by the distance to the closest provider that can serve them, nearest first.
 * Each item gets `nearest_provider_km` (rounded to 0.1 km), or null when no located provider serves it;
 * those go last, in their original order.
 */
export function nearestFirst<T extends Record<string, any>, P extends { geo?: LatLng }>(
  items: T[], providers: P[], here: LatLng, serves: (item: T, provider: P) => boolean,
): Array<T & { nearest_provider_km: number | null }> {
  const located = providers.filter((p) => p.geo && Number.isFinite(p.geo.lat) && Number.isFinite(p.geo.lng));
  return items
    .map((item, index) => {
      let best = Number.POSITIVE_INFINITY;
      for (const p of located) {
        if (serves(item, p)) best = Math.min(best, geo.distanceKm(here, p.geo as LatLng));
      }
      return { item: { ...item, nearest_provider_km: Number.isFinite(best) ? Math.round(best * 10) / 10 : null }, index };
    })
    .sort((a, b) => (a.item.nearest_provider_km ?? Infinity) - (b.item.nearest_provider_km ?? Infinity) || a.index - b.index)
    .map((x) => x.item);
}
