import type { MapProviderType } from "@/lib/map/book-href";

export const MAP_PROVIDER_TYPES: readonly MapProviderType[] = ["doctor", "hospital", "pharmacy", "lab", "nursing"];

/** The kind a `?type=` value names, or null (missing, unknown, repeated): the map then lists every kind. */
export function parseMapType(raw: string | string[] | undefined | null): MapProviderType | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && (MAP_PROVIDER_TYPES as readonly string[]).includes(value) ? (value as MapProviderType) : null;
}

/** The map's address for a locale, filtered to one kind of provider when given (`/ar/map?type=pharmacy`). */
export function mapEntryHref(locale: string, type?: MapProviderType): string {
  return type ? `/${locale}/map?type=${type}` : `/${locale}/map`;
}
