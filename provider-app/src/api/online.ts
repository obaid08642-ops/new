/**
 * P15.1 — offline detection for the single provider-app HTTP client.
 *
 * Reachability is tracked *reactively* from real request outcomes rather than by
 * a separate connectivity probe:
 *  - a transport-level failure (no response: DNS, TLS, airplane mode) marks the
 *    app offline and skips pointless retries;
 *  - any successful response marks it back online.
 *
 * `react-native`'s NetInfo is not a dependency of this app, and a synthetic probe
 * to a third-party host would add a second network round-trip (and a second
 * timeout) on the request path. A captured `offline` event is therefore also
 * accepted for callers that have one.
 *
 * This is a *hint*, never an authorisation gate: it decides whether to retry and
 * which catalog code to surface, not whether a request the OS could still route
 * is allowed through (captive portals, VPN split-tunnel).
 */
import type { EmitterSubscription } from 'react-native';

export type OnlineListener = (online: boolean) => void;

let online = true;
let subscribers: OnlineListener[] = [];

/** Apply a reachability verdict and notify subscribers if it changed. */
export function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  for (const fn of subscribers.slice()) {
    try {
      fn(next);
    } catch {
      /* one bad subscriber must not stop the rest */
    }
  }
}

export function isOnline(): boolean {
  return online;
}

/** Subscribe to reachability changes (re-check a screen after reconnecting). */
export function subscribeOnline(fn: OnlineListener): () => void {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter((s) => s !== fn);
  };
}

/**
 * Called by the HTTP client. `reached` is true when the attempt produced an HTTP
 * response of any status (including 5xx), false when it never reached the server.
 */
export function reportTransportOutcome(reached: boolean) {
  setOnline(reached);
}

/** Forget any cached verdict — used on app resume and by tests. */
export function resetOnlineState(next = true) {
  online = next;
}

export type { EmitterSubscription };