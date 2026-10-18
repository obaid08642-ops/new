// 17.3: the searches this device made, most recent first. Kept only on the device (localStorage): it is a convenience of
// the browser, not a record the server holds, so a storage that is blocked or full just means no list.
export const RECENT_SEARCHES_KEY = "nabd.recentSearches";
export const RECENT_SEARCHES_LIMIT = 6;

/** The term as the list stores it: at most 80 characters (by code point), trimmed, at least two characters. Else nothing. */
export function normaliseSearchTerm(term: string): string | null {
  const trimmed = Array.from(term).slice(0, 80).join("").trim();
  return trimmed.length >= 2 ? trimmed : null;
}

/** Adds a term to the front of the list, dropping the same term (case and spacing ignored) and anything past the limit. */
export function rememberSearch(list: readonly string[], term: string): string[] {
  const next = normaliseSearchTerm(term);
  if (!next) return [...list];
  const key = next.toLocaleLowerCase();
  return [next, ...list.filter((item) => item.toLocaleLowerCase() !== key)].slice(0, RECENT_SEARCHES_LIMIT);
}

/** The stored list, or an empty one when the storage is blocked or holds something that is not a list of text. */
export function readRecentSearches(storage: Pick<Storage, "getItem"> | null | undefined = safeStorage()): string[] {
  try {
    const raw = storage?.getItem(RECENT_SEARCHES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length >= 2).slice(0, RECENT_SEARCHES_LIMIT);
  } catch {
    return [];
  }
}

/** Writes the list back; a storage that refuses the write keeps the list in memory only. */
export function writeRecentSearches(list: readonly string[], storage: Pick<Storage, "setItem" | "removeItem"> | null | undefined = safeStorage()) {
  try {
    if (list.length === 0) storage?.removeItem(RECENT_SEARCHES_KEY);
    else storage?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // the list still works for this visit
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
