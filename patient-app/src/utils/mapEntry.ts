/** The providers map's `type` route param: which kind of provider the map opens filtered to (none = all kinds). */
export type MapKind = 'doctor' | 'hospital' | 'pharmacy' | 'lab' | 'nursing';
export const MAP_KINDS: readonly MapKind[] = ['doctor', 'hospital', 'pharmacy', 'lab', 'nursing'];

/** The kind a `type` param names, or null for a missing / unknown / repeated value (the map then shows every kind). */
export function parseMapKind(raw: unknown): MapKind | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && (MAP_KINDS as readonly string[]).includes(value) ? (value as MapKind) : null;
}

/** The route of the map for a kind (`/map?type=pharmacy`), or the plain `/map`. */
export function mapHref(kind?: MapKind): string {
  return kind ? `/map?type=${kind}` : '/map';
}
