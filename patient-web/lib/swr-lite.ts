/**
 * Stale-while-revalidate for client-fetched PUBLIC lists (F82-2). The last response of a URL is kept in this tab's
 * memory, so a list shows at once when it is opened again, while a fresh request replaces it.
 *
 * Privacy: memory only (a module variable), never localStorage, sessionStorage or a cookie, gone on reload; and only
 * for responses that are the same for every visitor, so nothing here ever holds a token or a patient's own data.
 * Anything per-patient is fetched with `cache: "no-store"` and not stored here. `clearSwr()` runs on sign-out anyway.
 */
const store = new Map<string, unknown>();

export function peekSwr<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function putSwr<T>(key: string, value: T): void {
  store.set(key, value);
}

export function clearSwr(): void {
  store.clear();
}
