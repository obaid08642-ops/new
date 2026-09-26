/**
 * SEO publishing controls (GO-gate item 3) — pure helpers consumed by
 * SeoService.sitemap()/robots(). Admin sets `seo_controls` docs via
 * POST /admin/ops/seo/controls; these functions translate them into
 * crawler-facing behavior. Missing control for a type ⇒ indexable (fail-open,
 * matching the pre-controls default).
 */

export interface SeoControlRow {
  route_key: string;
  indexable: boolean;
}

/** EntityType (seo module) → route_key used in seo_controls. */
export const ENTITY_ROUTE_KEYS: Record<string, string> = {
  medicine: 'medicine-catalog',
  doctor: 'doctors',
  'lab-service': 'lab-services',
  'home-care-service': 'home-care',
  facility: 'facilities',
  article: 'articles',
};

export function controlsMap(rows: Array<SeoControlRow | any>): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const r of rows || []) {
    if (r?.route_key) m.set(String(r.route_key).toLowerCase(), !!r.indexable);
  }
  return m;
}

/** True unless a control explicitly says indexable=false. */
export function isTypeIndexable(type: string, controls: Map<string, boolean>): boolean {
  const key = ENTITY_ROUTE_KEYS[type] || type;
  const v = controls.get(key.toLowerCase());
  return v !== false;
}

/** robots.txt Disallow lines for every blocked entity type. */
export function robotsDisallowLines(controls: Map<string, boolean>): string[] {
  const lines: string[] = [];
  for (const [type, key] of Object.entries(ENTITY_ROUTE_KEYS)) {
    if (controls.get(key.toLowerCase()) === false) {
      lines.push(`Disallow: /s/${type}/`);
    }
  }
  return lines;
}
