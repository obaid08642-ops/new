/**
 * #1556 owner decision F: one row per service in each catalogue.
 * Pure helpers shared by the seeders and by scripts/migrations/2026-10-services-dedupe.ts.
 *
 * Two rows are the same service when they share a normalized Arabic name, a normalized English name
 * or a code (short_code / test_code / code) inside the same catalogue (and, for labs, the same
 * package flag). Rows come in two shapes: new (`name_ar`/`name_en`) and old (`ar`/`en`, `title.ar`).
 */

export type CatalogDoc = Record<string, unknown> & { _id?: unknown };

/** Arabic letters with diacritics, tatweel and hamza/taa-marbuta/alef-maqsura variants folded; Latin lowercased. */
export function normalizeName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/[^a-z0-9ء-ي]+/g, '');
}

function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function nested(doc: CatalogDoc, key: string, lang: string): string {
  const v = doc[key];
  return v && typeof v === 'object' ? text((v as Record<string, unknown>)[lang]) : '';
}

export function nameAr(doc: CatalogDoc): string {
  return text(doc.name_ar) || text(doc.ar) || nested(doc, 'title', 'ar') || nested(doc, 'name', 'ar');
}

export function nameEn(doc: CatalogDoc): string {
  return text(doc.name_en) || text(doc.en) || nested(doc, 'title', 'en') || nested(doc, 'name', 'en');
}

/**
 * Same service under two English names (word order, or a name that always includes the other). Reviewed by hand;
 * near-duplicates that may differ (e.g. lumbar vs whole-spine MRI, abdomen vs abdomen-and-pelvis CT, post-surgery
 * visits of different length) are NOT here and go to the owner.
 */
const SAME_SERVICE: Record<string, string> = {
  ctbrain: 'brainctscan',
  mribrain: 'brainmri',
  bloodgroup: 'bloodgrouprhfactor',
  blooddrawforlabs: 'bloodsamplecollection',
  mothernewborncare: 'newbornmothercare',
  oxygentherapysetup: 'homeoxygentherapy',
};

/** Keys that identify the same service; any shared key joins two rows. */
export function identityKeys(doc: CatalogDoc, opts: { byPackage?: boolean } = {}): string[] {
  const scope = opts.byPackage ? (doc.is_package === true ? 'pkg:' : 'one:') : '';
  const keys: string[] = [];
  const ar = normalizeName(nameAr(doc));
  const en0 = normalizeName(nameEn(doc));
  const en = SAME_SERVICE[en0] || en0;
  if (ar) keys.push(`${scope}ar:${ar}`);
  if (en) keys.push(`${scope}en:${en}`);
  for (const k of ['short_code', 'test_code', 'code']) {
    const v = text(doc[k]).trim();
    if (v) keys.push(`${scope}code:${v.toLowerCase()}`);
  }
  return keys;
}

/** Groups of rows that are the same service (only groups with 2+ rows). Union-find over identityKeys. */
export function duplicateGroups<T extends CatalogDoc>(docs: T[], opts: { byPackage?: boolean } = {}): T[][] {
  const parent = docs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<string, number>();
  docs.forEach((d, i) => {
    for (const k of identityKeys(d, opts)) {
      const j = owner.get(k);
      if (j === undefined) owner.set(k, i);
      else parent[find(i)] = find(j);
    }
  });
  const groups = new Map<number, T[]>();
  docs.forEach((d, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) || []), d]);
  });
  return [...groups.values()].filter((g) => g.length > 1);
}

function filled(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function filledCount(doc: CatalogDoc): number {
  return Object.values(doc).filter(filled).length;
}

function time(doc: CatalogDoc): number {
  const t = doc.createdAt instanceof Date ? doc.createdAt.getTime() : Date.parse(text(doc.createdAt));
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

/**
 * The row to keep: a live row (not deleted, active, approved/verified) first, then the new record shape,
 * then the most filled fields, then the oldest row (the one any link most likely points at), then id order.
 */
export function pickKeeper<T extends CatalogDoc>(group: T[]): T {
  const score = (d: T) => [
    d.is_deleted === true ? 0 : 1,
    d.active === false || d.is_active === false ? 0 : 1,
    d.medical_review_status === 'approved' || d.catalog_status === 'verified' ? 1 : 0,
    text(d.name_ar) ? 1 : 0,
    text(d.short_code) || text(d.test_code) ? 1 : 0,
    filledCount(d),
  ];
  return [...group].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
    if (time(a) !== time(b)) return time(a) - time(b);
    return String(a.id ?? a._id).localeCompare(String(b.id ?? b._id));
  })[0];
}

/** Fields the kept row lacks but a removed row has (content is never lost by a merge). */
export function missingFields(keep: CatalogDoc, removed: CatalogDoc[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const skip = new Set(['_id', 'id', 'code', 'short_code', 'test_code', 'createdAt', 'updatedAt', '__v', 'is_deleted']);
  for (const r of removed) {
    for (const [k, v] of Object.entries(r)) {
      if (skip.has(k) || filled(keep[k]) || k in out || !filled(v)) continue;
      out[k] = v;
    }
  }
  return out;
}

/** Values a removed row is referenced by (its id and codes), each mapped to the kept row's value of the same kind. */
export function referenceMap(keep: CatalogDoc, removed: CatalogDoc[]): Map<string, string> {
  const map = new Map<string, string>();
  const keepId = text(keep.id) || String(keep._id ?? '');
  const keepCode = text(keep.short_code) || text(keep.test_code) || text(keep.code) || keepId;
  for (const r of removed) {
    const rid = text(r.id) || String(r._id ?? '');
    if (rid && rid !== keepId) map.set(rid, keepId);
    for (const k of ['short_code', 'test_code', 'code']) {
      const v = text(r[k]);
      if (v && v !== keepCode && v !== keepId && !map.has(v)) map.set(v, keepCode);
    }
  }
  return map;
}

/**
 * Rewrites every value at `path` (dot path; arrays are walked) found in `map`. Arrays of strings lose the
 * duplicates a rewrite creates. Returns the number of values changed.
 */
export function rewritePath(doc: Record<string, unknown>, path: string, map: Map<string, string>): number {
  const [head, ...rest] = path.split('.');
  const v = doc[head];
  if (v === undefined || v === null) return 0;
  if (!rest.length) {
    if (typeof v === 'string' && map.has(v)) {
      doc[head] = map.get(v);
      return 1;
    }
    if (Array.isArray(v)) {
      let n = 0;
      const next = v.map((x) => (typeof x === 'string' && map.has(x) ? (n++, map.get(x) as string) : x));
      if (n) doc[head] = next.filter((x, i) => typeof x !== 'string' || next.indexOf(x) === i);
      return n;
    }
    return 0;
  }
  if (Array.isArray(v)) {
    return v.reduce((n: number, x) => n + (x && typeof x === 'object' ? rewritePath(x as Record<string, unknown>, rest.join('.'), map) : 0), 0);
  }
  return typeof v === 'object' ? rewritePath(v as Record<string, unknown>, rest.join('.'), map) : 0;
}
