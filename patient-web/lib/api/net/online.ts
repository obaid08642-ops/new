/**
 * P15.1 — offline detection.
 *
 * The browser already knows (`navigator.onLine`, `online`/`offline` events), so
 * this is a thin, SSR-safe adapter that also gives `useSyncExternalStore` the
 * stable snapshot it requires (a snapshot that is recomputed on every render
 * causes an infinite loop).
 *
 * Caveat kept in the code rather than in a comment elsewhere: `navigator.onLine`
 * is false only when the OS reports no interface, so a captive portal or a
 * blackholed network still reports `true`. That is why `errors.networkError()`
 * also maps to the same "check your connection" outcome.
 */

export type OnlineListener = (online: boolean) => void;

export function browserIsOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

let snapshot: boolean | null = null;
const listeners = new Set<OnlineListener>();

function current(): boolean {
  if (snapshot === null) snapshot = !browserIsOffline();
  return snapshot;
}

function publish(online: boolean): void {
  if (snapshot === online) return;
  snapshot = online;
  for (const listener of [...listeners]) listener(online);
}

/** Server-safe: no `navigator`, no `window`. Always reports online. */
export function getOnlineSnapshot(): boolean {
  return current();
}

export function subscribeOnline(listener: OnlineListener): () => void {
  listeners.add(listener);
  if (typeof window === "undefined" || listeners.size > 1) {
    return () => {
      listeners.delete(listener);
    };
  }
  const sync = () => publish(!browserIsOffline());
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    }
  };
}
