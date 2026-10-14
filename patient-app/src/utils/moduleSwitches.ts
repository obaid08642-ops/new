/**
 * Module switches (owner decision 16, #335/#953): GET /modules answers { modules: { key: boolean } }.
 * Absent or true = on; only an explicit false hides a module. Unknown keys are ignored.
 *
 * ONE table maps each module key to the app routes that lead into it. Every entry point the app draws
 * (tab bar, home tiles, services tab, search shortcuts, account rows) asks `isRouteHidden`, and a deep link
 * into a hidden module is stopped by the route gate. Routes are written without the `(tabs)` group, as
 * expo-router's pathname has them; `moduleForRoute` strips it from a route before comparing.
 */

export const MODULE_KEYS = [
  'pharmacy',
  'consultations',
  'labs_radiology',
  'nursing',
  'nutrition',
  'maternity',
  'mental_health',
  'family',
  'insurance',
  'loyalty',
  'ai',
  'articles',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** module -> route prefixes that belong to it (a prefix matches itself, `/…`, `?…` and `&…` after it). */
export const MODULE_ROUTES: Record<ModuleKey, readonly string[]> = {
  pharmacy: ['/pharmacy', '/medicine', '/drug-scanner'],
  consultations: ['/consultations', '/doctor', '/search?view=doctors'],
  labs_radiology: ['/diagnostics'],
  nursing: ['/nursing'],
  nutrition: ['/nutrition'],
  maternity: ['/maternity'],
  mental_health: ['/mental-health'],
  family: ['/family', '/health/family-hub', '/health/family-chat', '/health/family-calendar', '/health/family-member-detail', '/health/add-family-member'],
  insurance: ['/insurance', '/profile/insurance'],
  loyalty: ['/loyalty'],
  ai: ['/ai', '/ai-assistant'],
  articles: ['/articles'],
};

export type DisabledModules = ReadonlySet<ModuleKey>;
export const NONE_DISABLED: DisabledModules = new Set<ModuleKey>();

/** The modules switched off by a GET /modules payload; anything unexpected switches nothing off. */
export function parseDisabled(payload: unknown): DisabledModules {
  const map = (payload as { modules?: unknown } | null | undefined)?.modules;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return NONE_DISABLED;
  const off = new Set<ModuleKey>();
  for (const key of MODULE_KEYS) {
    if ((map as Record<string, unknown>)[key] === false) off.add(key);
  }
  return off;
}

const BOUNDARY = new Set(['', '/', '?', '&']);

/** Expo-router paths and hrefs: `/(tabs)/pharmacy` and `/pharmacy` are the same place. */
const normalize = (route: string): string => route.trim().replace(/^\/\(tabs\)(?=\/|$)/, '') || '/';

/** The module a route belongs to, or null when no switch governs it. */
export function moduleForRoute(route: string | null | undefined): ModuleKey | null {
  if (!route) return null;
  const path = normalize(route);
  for (const key of MODULE_KEYS) {
    for (const prefix of MODULE_ROUTES[key]) {
      if (path.startsWith(prefix) && BOUNDARY.has(path.charAt(prefix.length))) return key;
    }
  }
  return null;
}

export function isRouteHidden(route: string | null | undefined, disabled: DisabledModules): boolean {
  const key = moduleForRoute(route);
  return key !== null && disabled.has(key);
}

/** Keeps the items whose route is not in a switched-off module. */
export function visibleItems<T>(items: readonly T[], routeOf: (item: T) => string | null | undefined, disabled: DisabledModules): T[] {
  return disabled.size === 0 ? [...items] : items.filter((item) => !isRouteHidden(routeOf(item), disabled));
}

/** The backend refuses a switched-off module with 403 and the message `module_disabled:<key>` (apiFetch prefixes AUTH_ERROR_403). */
export function moduleDisabledKey(error: unknown): ModuleKey | 'unknown' | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const hit = /module_disabled:([a-z_]+)/.exec(message);
  if (!hit) return null;
  return (MODULE_KEYS as readonly string[]).includes(hit[1]) ? (hit[1] as ModuleKey) : 'unknown';
}

type DisabledListener = (key: ModuleKey) => void;
let disabledListener: DisabledListener | null = null;

/** apiFetch tells the app when the backend refuses a call with module_disabled, so the gate reacts without waiting for a refresh. */
export function setModuleDisabledListener(listener: DisabledListener | null): void {
  disabledListener = listener;
}

export function reportModuleRefusal(error: unknown): void {
  const key = moduleDisabledKey(error);
  if (key && key !== 'unknown') disabledListener?.(key);
}
