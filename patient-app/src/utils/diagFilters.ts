/**
 * The filter sheet of the labs / radiology hub (owner review G6). Each tab offers only the options that change its own lists:
 * - labs: tests only, packages only, labs only, highest rated (the server orders the tests; it orders the labs strip too), lowest price
 *   (the server orders the tests; packages are ordered here), home collection (keeps the services and labs that do home visits);
 * - radiology: highest rated, lowest price (both ordered by the server) and home visit (keeps the scans that do home visits). The scan type
 *   chips are a filter too (the server filters by category).
 */
export type FilterId = 'all' | 'tests' | 'packages' | 'labs' | 'highest_rated' | 'lowest_price' | 'home_visit';
export type FilterOption = { id: FilterId; key: string };
export type DiagTab = 'labs' | 'radiology';

export const LAB_FILTERS: FilterOption[] = [
  { id: 'all', key: 'diag.filter.all' },
  { id: 'tests', key: 'diag.filter.tests' },
  { id: 'packages', key: 'diag.filter.packages' },
  { id: 'labs', key: 'diag.filter.labs' },
  { id: 'highest_rated', key: 'diag.filter.rating' },
  { id: 'lowest_price', key: 'diag.filter.price' },
  { id: 'home_visit', key: 'diag.filter.home' },
];
export const RAD_FILTERS: FilterOption[] = [
  { id: 'all', key: 'diag.filter.all' },
  { id: 'highest_rated', key: 'diag.filter.rating' },
  { id: 'lowest_price', key: 'diag.filter.price' },
  { id: 'home_visit', key: 'diag.filter.home' },
];

export const filtersFor = (tab: DiagTab): FilterOption[] => (tab === 'labs' ? LAB_FILTERS : RAD_FILTERS);

/** A filter chosen on one tab that the other tab does not offer falls back to "all" (it would change nothing there). */
export const filterForTab = (filter: FilterId, tab: DiagTab): FilterId => (filtersFor(tab).some((o) => o.id === filter) ? filter : 'all');

/** Filters that are on: the chosen option (not "all") plus the chosen category chip. Defaults are not counted. */
export const activeFilterCount = (filter: FilterId, category: string): number => (filter === 'all' ? 0 : 1) + (category !== '' ? 1 : 0);
