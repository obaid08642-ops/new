import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../packages/ui/icons/fill';

/**
 * Global search (D-29, GET /search?q=&locale= : the grouped home search): what a result is, which filled icon and
 * tone draw it (handoff service map), the filter chips and the board's section groups.
 * Pure functions, so the screen and its tests read the same rules.
 */

/** A row of the results page. Only `type` is certain; every other field is hidden when the backend omits it. */
export interface SearchResult {
  id?: string;
  slug?: string;
  /** The page's kind, an Arabic source word: دكتور، تخصص، دواء، تحليل، أشعة، تمريض، مقال. */
  type: string;
  typeEn?: string;
  name?: string;
  nameEn?: string;
  sub?: string;
  subEn?: string;
  price?: string | null;
  priceEn?: string | null;
  /** Medicine rows: the catalogue's flags (rx-rules-app #2); the row shows the same note as the product card. */
  requires_prescription?: boolean;
  online_exclusive?: boolean;
}

/** The search API's item types → the page's kinds. */
const KIND_OF_TYPE: Record<string, string> = {
  medicine: 'دواء',
  doctor: 'دكتور',
  specialty: 'تخصص',
  lab_test: 'تحليل',
  lab_package: 'تحليل',
  radiology: 'أشعة',
  nursing: 'تمريض',
  article: 'مقال',
};

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/**
 * Rows of the grouped answer `{ groups: [{ type, items }] }`. Each name is already the one for the screen's
 * language (the API picks it), so it fills both name fields. A specialty opens by its code, an article by its slug.
 */
export function fromGrouped(payload: unknown): SearchResult[] {
  const groups = payload && typeof payload === 'object' && Array.isArray((payload as { groups?: unknown }).groups)
    ? ((payload as { groups: unknown[] }).groups)
    : [];
  return groups.flatMap((g) => {
    const items = g && typeof g === 'object' && Array.isArray((g as { items?: unknown }).items) ? (g as { items: unknown[] }).items : [];
    return items.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const row = value as Record<string, unknown>;
      const type = typeof row.type === 'string' ? KIND_OF_TYPE[row.type] : undefined;
      const name = text(row.name);
      const id = type === 'تخصص' ? text(row.code) : text(row.id);
      if (!type || !name || !id) return [];
      const price = typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0 ? String(row.price) : null;
      const flags = type === 'دواء'
        ? { requires_prescription: row.requires_prescription === true, online_exclusive: row.online_exclusive === true }
        : {};
      return [{ id, slug: text(row.slug), type, name, nameEn: name, price, priceEn: price, ...flags }];
    });
  });
}

/** The medicine row's note, the same words and order as the product card (pharmacyCatalog productNote). */
export function rowNote(r: Pick<SearchResult, 'requires_prescription' | 'online_exclusive'>, labels: { rx: string; online: string }): string | undefined {
  const parts = [r.requires_prescription === true ? labels.rx : '', r.online_exclusive === true ? labels.online : ''].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export const TYPE_ICON: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  'دكتور': SERVICE_ICONS.consult,
  'تخصص': SERVICE_ICONS.consult,
  'دواء': SERVICE_ICONS.pharmacy,
  'تحليل': SERVICE_ICONS.lab,
  'أشعة': SERVICE_ICONS.radiology,
  'تمريض': SERVICE_ICONS.nursing,
  'مقال': { icon: 'file-text', tone: 'violet' },
};
const FALLBACK_ICON: { icon: FillIconName; tone: ServiceTone } = { icon: 'magnifying-glass', tone: 'blue' };
export const iconFor = (type: string) => TYPE_ICON[type] ?? FALLBACK_ICON;

/** One filter chip: the types it keeps. `all` keeps everything. Labels are Arabic source text. */
export interface SearchFilter {
  key: string;
  label: string;
  types: string[] | null;
}

export const FILTERS: SearchFilter[] = [
  { key: 'all', label: 'الكل', types: null },
  { key: 'meds', label: 'أدوية', types: ['دواء'] },
  { key: 'doctors', label: 'أطباء', types: ['دكتور'] },
  { key: 'labs', label: 'تحاليل', types: ['تحليل'] },
  { key: 'radiology', label: 'أشعة', types: ['أشعة'] },
  { key: 'specialties', label: 'تخصصات', types: ['تخصص'] },
  { key: 'nursing', label: 'تمريض', types: ['تمريض'] },
  { key: 'articles', label: 'مقالات', types: ['مقال'] },
];

/** A block of the results page (canvas/Search): its title and the result types it lists. */
export interface SearchSection {
  key: string;
  title: string;
  types: string[];
  /** `cards` is the board's horizontal row of doctor cards; `list` the rows of one white card. */
  layout: 'list' | 'cards';
  /** The rows a section shows under "All" before "See all (n)" (list sections). */
  preview: number;
}

export const SECTIONS: SearchSection[] = [
  { key: 'meds', title: 'أدوية ومنتجات', types: ['دواء'], layout: 'list', preview: 3 },
  { key: 'doctors', title: 'أطباء', types: ['دكتور'], layout: 'cards', preview: 6 },
  { key: 'specialties', title: 'تخصصات', types: ['تخصص'], layout: 'list', preview: 3 },
  { key: 'tests', title: 'تحاليل وأشعة', types: ['تحليل', 'أشعة'], layout: 'list', preview: 3 },
  { key: 'nursing', title: 'خدمات تمريض', types: ['تمريض'], layout: 'list', preview: 3 },
  { key: 'articles', title: 'مقالات ومعلومات', types: ['مقال'], layout: 'list', preview: 3 },
];

/** How many results each chip would show, for the counts on the chips. */
export function countByFilter(rows: SearchResult[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of FILTERS) out[f.key] = f.types ? rows.filter((r) => f.types!.includes(r.type)).length : rows.length;
  return out;
}

export interface ResultBlock {
  section: SearchSection;
  rows: SearchResult[];
}

/** The blocks of the page for the chosen chip: only blocks that have results, each with its rows. */
export function blocksFor(rows: SearchResult[], filterKey: string): ResultBlock[] {
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const kept = filter.types ? rows.filter((r) => filter.types!.includes(r.type)) : rows;
  const blocks: ResultBlock[] = [];
  for (const section of SECTIONS) {
    // In the API's relevance order: nothing is promoted (decision 29).
    const own = kept.filter((r) => section.types.includes(r.type));
    if (own.length) blocks.push({ section, rows: own });
  }
  return blocks;
}

/** Where a result opens (the screen's routes, unchanged by the redesign). `null` when it cannot open. */
export function routeFor(r: SearchResult): { pathname: string; params?: Record<string, string> } | string | null {
  const id = r.id;
  if (!id) return null;
  switch (r.type) {
    case 'دكتور': return `/consultations/doctor/${id}`;
    case 'تخصص': return { pathname: '/search', params: { view: 'doctors', specialty: id } };
    case 'دواء': return { pathname: '/pharmacy/product-detail', params: { id } };
    case 'تحليل': return { pathname: '/diagnostics/test-detail', params: { id } };
    case 'أشعة': return { pathname: '/diagnostics/test-detail', params: { id, type: 'radiology' } };
    case 'تمريض': return { pathname: '/nursing/service-details', params: { serviceId: id } };
    case 'مقال': return `/articles/${r.slug || id}`;
    default: return null;
  }
}
