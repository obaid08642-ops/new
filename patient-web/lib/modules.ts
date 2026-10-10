import { locales } from "@/lib/i18n";

/**
 * Module switches (owner decision 16, #335/#953): GET /modules answers { modules: { key: boolean } }.
 * Absent or true = on; only an explicit false hides a module. Unknown keys are ignored.
 *
 * ONE table maps each module key to the web pages that lead into it (path after the locale). Every entry
 * point the web draws (top bar, tab bar, service grid, assistant card, "all services" rows, curated cards,
 * footer, sitemap) asks `isPathHidden`, and the locale layout stops a deep link into a hidden module.
 */
export const MODULE_KEYS = [
  "pharmacy",
  "consultations",
  "labs_radiology",
  "nursing",
  "nutrition",
  "maternity",
  "mental_health",
  "family",
  "insurance",
  "loyalty",
  "ai",
  "articles",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_PATHS: Record<ModuleKey, readonly string[]> = {
  pharmacy: ["/c", "/p", "/pharmacy", "/pharmacies", "/medicine", "/medicines", "/medicine-catalog", "/drug-scanner", "/offers"],
  consultations: ["/consultations", "/doctors", "/doctor", "/appointments"],
  labs_radiology: ["/diagnostics", "/labs", "/radiology"],
  nursing: ["/nursing", "/home-care", "/home-nursing"],
  nutrition: ["/nutrition"],
  maternity: ["/maternity"],
  mental_health: ["/mental-health"],
  family: ["/family"],
  insurance: ["/insurance"],
  loyalty: ["/loyalty"],
  ai: ["/ai"],
  articles: ["/articles"],
};

/** Sitemap entries (the sitemap index file names) that belong to a module. */
export const MODULE_SITEMAPS: Partial<Record<ModuleKey, readonly string[]>> = {
  consultations: ["doctors.xml"],
  pharmacy: ["pharmacies.xml"],
  labs_radiology: ["labs.xml", "radiology.xml"],
};

export type DisabledModules = ReadonlySet<ModuleKey>;
export const NONE_DISABLED: DisabledModules = new Set<ModuleKey>();

/** The modules switched off by a GET /modules payload; anything unexpected switches nothing off (fail-open). */
export function parseDisabled(payload: unknown): DisabledModules {
  const map = (payload as { modules?: unknown } | null | undefined)?.modules;
  if (!map || typeof map !== "object" || Array.isArray(map)) return NONE_DISABLED;
  const off = new Set<ModuleKey>();
  for (const key of MODULE_KEYS) {
    if ((map as Record<string, unknown>)[key] === false) off.add(key);
  }
  return off;
}

const LOCALE_PREFIX = new RegExp(`^/(?:${locales.join("|")})(?=/|$)`);
const BOUNDARY = new Set(["", "/", "?", "#"]);

/** The module a page belongs to (`/ar/loyalty/hub`, `/loyalty`, `/en/c/vitamins?x=1`), or null when no switch governs it. */
export function moduleForPath(path: string | null | undefined): ModuleKey | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  const rest = path.replace(LOCALE_PREFIX, "") || "/";
  for (const key of MODULE_KEYS) {
    for (const prefix of MODULE_PATHS[key]) {
      if (rest.startsWith(prefix) && BOUNDARY.has(rest.charAt(prefix.length))) return key;
    }
  }
  return null;
}

export function isPathHidden(path: string | null | undefined, disabled: DisabledModules): boolean {
  const key = moduleForPath(path);
  return key !== null && disabled.has(key);
}

/** Keeps the items whose path is not in a switched-off module. */
export function visibleItems<T>(items: readonly T[], pathOf: (item: T) => string | null | undefined, disabled: DisabledModules): T[] {
  return disabled.size === 0 ? [...items] : items.filter((item) => !isPathHidden(pathOf(item), disabled));
}

/** The backend refuses a switched-off module with 403 and the message `module_disabled:<key>`. */
export function moduleDisabledKey(message: unknown): ModuleKey | "unknown" | null {
  const text = typeof message === "string" ? message : message instanceof Error ? message.message : "";
  const hit = /module_disabled:([a-z_]+)/.exec(text);
  if (!hit) return null;
  return (MODULE_KEYS as readonly string[]).includes(hit[1]) ? (hit[1] as ModuleKey) : "unknown";
}
