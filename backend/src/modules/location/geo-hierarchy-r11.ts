/**
 * 13.R11 — Saudi location hierarchy support (Region → City → District).
 *
 * PURE helpers only: no NestJS, no Mongoose, no DB. Complements the existing
 * `Location` mongoose schema (schemas/location.schema.ts — NOT modified),
 * which already stores parent_code / aliases / coordinates.
 *
 * Real owner dataset import is OUT OF SCOPE for R11; these helpers operate on
 * plain objects so the future import pipeline can reuse validation + lookup
 * without coupling to a persistence layer.
 */

export type R11NodeType = 'region' | 'city' | 'district';

export interface R11Coordinates {
  lat: number;
  lng: number;
}

export interface R11HierarchyNode {
  code: string;
  name_ar: string;
  name_en: string;
  type: R11NodeType;
  /** Region nodes use null; city points at a region code; district at a city code. */
  parent_code: string | null;
  /** Alternate names / spellings, any language. */
  aliases: string[];
  /** Latin transliterations of the Arabic name (e.g. "al-malqa"). */
  transliterations: string[];
  coordinates?: R11Coordinates;
  is_active: boolean;
}

export interface R11Index {
  byCode: Map<string, R11HierarchyNode>;
  /** normalized alias/transliteration/name → node codes */
  byAlias: Map<string, string[]>;
  /** parent code → child codes (insertion order preserved) */
  childrenOf: Map<string, string[]>;
}

/**
 * Lightweight search normalization (self-contained mirror of the repo's
 * normalizeSearchText contract): lowercase, strip Arabic diacritics + tatweel,
 * unify alef/hamza forms, teh-marbuta → heh, alef-maqsura → yeh.
 */
export function normalizeR11Text(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFKD');
  // Strip combining marks (diacritics) + tatweel U+0640.
  s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  s = s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** All lookup keys for a node: names + aliases + transliterations, normalized. */
export function r11LookupKeys(node: R11HierarchyNode): string[] {
  const out = new Set<string>();
  const raws = [node.name_ar, node.name_en, ...node.aliases, ...node.transliterations];
  for (const r of raws) {
    const n = normalizeR11Text(r);
    if (n.length >= 2) out.add(n);
  }
  return [...out];
}

export function buildR11Index(nodes: R11HierarchyNode[]): R11Index {
  const byCode = new Map<string, R11HierarchyNode>();
  const byAlias = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    byCode.set(n.code, n);
    if (n.parent_code) {
      const arr = childrenOf.get(n.parent_code) ?? [];
      arr.push(n.code);
      childrenOf.set(n.parent_code, arr);
    }
    for (const key of r11LookupKeys(n)) {
      const arr = byAlias.get(key) ?? [];
      if (!arr.includes(n.code)) arr.push(n.code);
      byAlias.set(key, arr);
    }
  }
  return { byCode, byAlias, childrenOf };
}

/** Alias / transliteration / name lookup (exact normalized match). */
export function resolveR11Alias(index: R11Index, text: string): R11HierarchyNode[] {
  const key = normalizeR11Text(text);
  if (key.length < 2) return [];
  const codes = index.byAlias.get(key) ?? [];
  return codes
    .map((c) => index.byCode.get(c))
    .filter((n): n is R11HierarchyNode => !!n && n.is_active);
}

/** Direct children of a parent code (e.g. cities of a region). */
export function getR11Children(index: R11Index, parentCode: string): R11HierarchyNode[] {
  const codes = index.childrenOf.get(parentCode) ?? [];
  return codes
    .map((c) => index.byCode.get(c))
    .filter((n): n is R11HierarchyNode => !!n && n.is_active);
}

/** Full ancestor path leaf-first: district → city → region. */
export function getR11Path(index: R11Index, code: string): R11HierarchyNode[] {
  const path: R11HierarchyNode[] = [];
  let cur = index.byCode.get(code);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.code)) {
    seen.add(cur.code);
    path.push(cur);
    cur = cur.parent_code ? index.byCode.get(cur.parent_code) : undefined;
  }
  return path;
}

/** All descendants of a code at any depth (BFS, cycle-safe). */
export function getR11Descendants(index: R11Index, code: string): R11HierarchyNode[] {
  const out: R11HierarchyNode[] = [];
  const seen = new Set<string>([code]);
  const queue = [...(index.childrenOf.get(code) ?? [])];
  while (queue.length) {
    const c = queue.shift() as string;
    if (seen.has(c)) continue;
    seen.add(c);
    const n = index.byCode.get(c);
    if (!n) continue;
    out.push(n);
    queue.push(...(index.childrenOf.get(c) ?? []));
  }
  return out.filter((n) => n.is_active);
}

export interface R11ImportError {
  code: string;
  message: string;
}

const R11_EXPECTED_PARENT: Record<R11NodeType, R11NodeType | null> = {
  region: null,
  city: 'region',
  district: 'city',
};

/**
 * Import-pipeline validation for owner-supplied rows (pure, no DB):
 * unique codes, valid type ladder (city→region, district→city),
 * every non-region row references an existing parent, coords in range.
 */
export function validateR11Import(rows: R11HierarchyNode[]): {
  valid: R11HierarchyNode[];
  errors: R11ImportError[];
} {
  const errors: R11ImportError[] = [];
  const seen = new Set<string>();
  const byCode = new Map(rows.map((r) => [r.code, r]));

  for (const r of rows) {
    if (!r.code || typeof r.code !== 'string') {
      errors.push({ code: String(r.code), message: 'missing code' });
      continue;
    }
    if (seen.has(r.code)) {
      errors.push({ code: r.code, message: 'duplicate code' });
      continue;
    }
    seen.add(r.code);

    const expected = R11_EXPECTED_PARENT[r.type];
    if (expected === undefined) {
      errors.push({ code: r.code, message: `unknown type '${(r as { type: string }).type}'` });
      continue;
    }
    if (expected === null) {
      if (r.parent_code !== null) {
        errors.push({ code: r.code, message: 'region must have null parent_code' });
        continue;
      }
    } else {
      const parent = r.parent_code ? byCode.get(r.parent_code) : undefined;
      if (!parent) {
        errors.push({ code: r.code, message: `missing parent '${r.parent_code}'` });
        continue;
      }
      if (parent.type !== expected) {
        errors.push({
          code: r.code,
          message: `expected parent type '${expected}', got '${parent.type}'`,
        });
        continue;
      }
    }

    if (r.coordinates) {
      const { lat, lng } = r.coordinates;
      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        lat < 16 ||
        lat > 33 ||
        lng < 34 ||
        lng > 56
      ) {
        errors.push({ code: r.code, message: 'coordinates outside Saudi bounding box' });
        continue;
      }
    }
  }

  const bad = new Set(errors.map((e) => e.code));
  return { valid: rows.filter((r) => r.code && !bad.has(r.code)), errors };
}
