import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../packages/ui/icons/fill';

/**
 * Global search (GET /home/search): what a result is, which filled icon and tone draw it (handoff service map; the
 * backend's own hex colours and icon names are not used), the filter chips and the board's section groups.
 * Pure functions, so the screen and its tests read the same rules.
 */

/** A row of GET /home/search. Only `type` is certain; every other field is hidden when the backend omits it. */
export interface SearchResult {
  id?: string;
  slug?: string;
  /** Arabic type name, the backend's key: دكتور، دواء، تحليل، أشعة، باقة، مقال، مرض، تأمين، عائلة. */
  type: string;
  typeEn?: string;
  name?: string;
  nameEn?: string;
  sub?: string;
  subEn?: string;
  price?: string | null;
  priceEn?: string | null;
  sponsored?: boolean;
}

export const TYPE_ICON: Record<string, { icon: FillIconName; tone: ServiceTone }> = {
  'دكتور': SERVICE_ICONS.consult,
  'دواء': SERVICE_ICONS.pharmacy,
  'تحليل': SERVICE_ICONS.lab,
  'أشعة': SERVICE_ICONS.radiology,
  'باقة': { icon: 'tag', tone: 'amber' },
  'مقال': { icon: 'file-text', tone: 'violet' },
  'مرض': { icon: 'thermometer', tone: 'peach' },
  'تأمين': SERVICE_ICONS.insurance,
  'عائلة': SERVICE_ICONS.family,
};
const FALLBACK_ICON: { icon: FillIconName; tone: ServiceTone } = { icon: 'magnifying-glass', tone: 'ink' };
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
  { key: 'offers', label: 'عروض', types: ['باقة'] },
  { key: 'articles', label: 'مقالات', types: ['مقال'] },
  { key: 'diseases', label: 'أمراض', types: ['مرض'] },
  { key: 'insurance', label: 'تأمين', types: ['تأمين'] },
  { key: 'family', label: 'عائلة', types: ['عائلة'] },
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
  { key: 'tests', title: 'تحاليل وأشعة', types: ['تحليل', 'أشعة'], layout: 'list', preview: 3 },
  { key: 'offers', title: 'عروض', types: ['باقة'], layout: 'list', preview: 3 },
  { key: 'articles', title: 'مقالات ومعلومات', types: ['مقال', 'مرض'], layout: 'list', preview: 3 },
  { key: 'insurance', title: 'تأمين', types: ['تأمين'], layout: 'list', preview: 3 },
  { key: 'family', title: 'عائلة', types: ['عائلة'], layout: 'list', preview: 3 },
];

/** Sponsored results first, otherwise in the order the backend returned them. */
export function sponsoredFirst<T extends { sponsored?: boolean }>(rows: T[]): T[] {
  return [...rows.filter((r) => r.sponsored), ...rows.filter((r) => !r.sponsored)];
}

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
    const own = sponsoredFirst(kept.filter((r) => section.types.includes(r.type)));
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
    case 'باقة': return { pathname: '/offers/[id]', params: { id } }; // the campaign's own page (GET /offers/:id)
    case 'دواء': return { pathname: '/pharmacy/product-detail', params: { id } };
    case 'تحليل': return { pathname: '/diagnostics/test-detail', params: { id } };
    case 'أشعة': return { pathname: '/diagnostics/test-detail', params: { id, type: 'radiology' } };
    case 'مقال':
    case 'مرض': return `/articles/${r.slug || id}`;
    case 'تأمين': return '/insurance';
    case 'عائلة': return { pathname: '/family/member-health', params: { id } };
    default: return null;
  }
}
