/**
 * Issue 1832: a booking stores the name of the test, the scan or the nursing service only in Arabic and English (written when
 * it was created), so the bookings lists could not show the other four languages. The booking keeps the catalogue id of each
 * line (labs `items[].service_id`, radiology `items[].service_id`, nursing `service_id`); the read endpoints resolve the name
 * from the catalogue in all six languages with ONE batched query per list, and the stored Arabic/English stay the fallback
 * (old rows, deleted catalogue entries, a catalogue row that lacks a language).
 */
export const NAME_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
export type NameLang = (typeof NAME_LANGS)[number];
export type LocalizedNames = Partial<Record<NameLang, string>>;

/** The projection of the catalogue columns the resolver reads. */
export const NAME_PROJECTION = { _id: 0, id: 1, name_ar: 1, name_en: 1, name_ur: 1, name_hi: 1, name_bn: 1, name_tl: 1 } as const;

const clean = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** `name_<lang>` of a catalogue row (or of a stored line) as a map; empty values are dropped. */
export function namesOf(row: Record<string, unknown> | null | undefined): LocalizedNames {
  const out: LocalizedNames = {};
  if (!row) return out;
  for (const lang of NAME_LANGS) {
    const v = clean(row[`name_${lang}`]);
    if (v) out[lang] = v;
  }
  return out;
}

/**
 * The names of one saved line: the catalogue row's languages when its id resolved, with the line's own stored Arabic/English
 * filling a language the catalogue row lacks. A line without an id (or with an id the catalogue no longer has) keeps just what
 * it stored.
 */
export function resolveLineNames(stored: { name_ar?: unknown; name_en?: unknown } | null | undefined, catalogue: Record<string, unknown> | null | undefined): LocalizedNames {
  const fromCatalogue = namesOf(catalogue);
  const own = namesOf(stored as Record<string, unknown> | undefined);
  return { ...(own.ar ? { ar: own.ar } : {}), ...(own.en ? { en: own.en } : {}), ...fromCatalogue, ...(fromCatalogue.ar ? {} : own.ar ? { ar: own.ar } : {}), ...(fromCatalogue.en ? {} : own.en ? { en: own.en } : {}) };
}

/** Distinct catalogue ids out of any number of lines (strings only, capped so one request cannot become a huge $in). */
export function idsOf(ids: Iterable<unknown>, cap = 500): string[] {
  const out = new Set<string>();
  for (const id of ids) {
    if (typeof id === 'string' && id && id.length <= 128) out.add(id);
    if (out.size >= cap) break;
  }
  return [...out];
}

/** One batched read of the catalogue rows by id: `load` is the caller's query (it passes NAME_PROJECTION); a failure leaves the stored names. */
export async function loadCatalogue(load: (ids: string[]) => Promise<Array<Record<string, unknown>>>, ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (!ids.length) return map;
  try {
    for (const row of await load(ids)) if (row && typeof row.id === 'string') map.set(row.id, row);
  } catch {
    // the names are an enrichment of a booking read: never fail the read for them
  }
  return map;
}

type Plain = Record<string, any>;

/**
 * Lab and radiology bookings: every `items[]` line gets `names` (six languages); the booking gets `item_names` as the list in
 * line order for readers that show the first line only (`items[0].names`).
 */
export async function withItemNames(bookings: Plain[], load: (ids: string[]) => Promise<Array<Record<string, unknown>>>): Promise<Plain[]> {
  const catalogue = await loadCatalogue(load, idsOf(bookings.flatMap((b) => (Array.isArray(b.items) ? b.items.map((i: Plain) => i?.service_id) : []))));
  return bookings.map((b) => {
    if (!Array.isArray(b.items)) return b;
    return { ...b, items: b.items.map((i: Plain) => (i && typeof i === 'object' ? { ...i, names: resolveLineNames(i, catalogue.get(i.service_id)) } : i)) };
  });
}

/** Nursing bookings: `service_names` from `service_id`, the stored `service_name_ar/en` as the fallback. */
export async function withServiceNames(bookings: Plain[], load: (ids: string[]) => Promise<Array<Record<string, unknown>>>): Promise<Plain[]> {
  const catalogue = await loadCatalogue(load, idsOf(bookings.map((b) => b.service_id)));
  return bookings.map((b) => ({
    ...b,
    service_names: resolveLineNames({ name_ar: b.service_name_ar, name_en: b.service_name_en }, catalogue.get(b.service_id)),
  }));
}

/** Radiology bookings also carry the scan name at the top (`scan_name_ar/en`); `scan_names` is the same resolution of the first line. */
export function withScanNames(booking: Plain): Plain {
  const first = Array.isArray(booking.items) ? booking.items[0] : undefined;
  const fromLine = first && typeof first.names === 'object' ? (first.names as LocalizedNames) : undefined;
  return { ...booking, scan_names: fromLine && Object.keys(fromLine).length ? fromLine : resolveLineNames({ name_ar: booking.scan_name_ar, name_en: booking.scan_name_en }, undefined) };
}
