"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * F82-3: who is looking at the page, decided in the BROWSER.
 *
 * The public pages are static/ISR: one HTML for every visitor, shared by the Next cache and the edge, so it can hold
 * nothing that depends on the session (no cookie read on the server, no per-user link target). The parts that differ
 * for a signed-in patient (sign-in or account link, notifications, sign-out, the presence heartbeat, the signed-out-only
 * prefetch of `/diagnostics`) ask this hook after hydration.
 *
 * One request per page load (`GET /api/auth/session`, `no-store`) however many components ask; the answer lives in
 * this module's memory only (never storage), and `resetSessionIdentity()` clears it when the person signs in or out.
 * `unknown` is the neutral state of the server HTML and of the first client render, so server and client agree.
 */
export type SessionIdentity = { status: "unknown" } | { status: "anonymous" } | { status: "authenticated" };

const UNKNOWN: SessionIdentity = { status: "unknown" };
const ANONYMOUS: SessionIdentity = { status: "anonymous" };
const AUTHENTICATED: SessionIdentity = { status: "authenticated" };

let current: SessionIdentity = UNKNOWN;
let inflight: Promise<void> | null = null;
let generation = 0;
const listeners = new Set<() => void>();

function publish(next: SessionIdentity) {
  current = next;
  listeners.forEach((listener) => listener());
}

/** Asks the server once; later calls while a request is out, or after an answer, do nothing. */
export function loadSessionIdentity(): Promise<void> {
  if (current.status !== "unknown") return Promise.resolve();
  if (inflight) return inflight;
  const mine = generation;
  inflight = fetch("/api/auth/session", { method: "GET", cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } })
    .then(async (response) => {
      const body = response.ok ? ((await response.json().catch(() => null)) as { authenticated?: unknown } | null) : null;
      return body?.authenticated === true ? AUTHENTICATED : ANONYMOUS;
    })
    .catch(() => ANONYMOUS)
    .then((next) => {
      // A sign-in or sign-out while the request was out makes its answer stale: ask again.
      if (mine === generation) publish(next);
    })
    .finally(() => {
      if (mine === generation) inflight = null;
    });
  return inflight;
}

/** The person signed in or out (or the session changed): forget the answer; mounted components ask again. */
export function resetSessionIdentity(): void {
  generation += 1;
  inflight = null;
  publish(UNKNOWN);
  if (listeners.size > 0) void loadSessionIdentity();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current answer without subscribing (for code outside a component, and for tests). */
export function peekSessionIdentity(): SessionIdentity {
  return current;
}

/** Test seam: back to the state of a fresh page load. */
export function __resetSessionIdentityForTests(): void {
  generation += 1;
  inflight = null;
  current = UNKNOWN;
  listeners.clear();
}

/**
 * The session identity of this page load. `enabled: false` reads without asking (a component that needs the answer
 * only for some links does not cause the request on a page where it has no use for it).
 */
export function useSessionIdentity({ enabled = true }: { enabled?: boolean } = {}): SessionIdentity {
  const identity = useSyncExternalStore(subscribe, () => current, () => UNKNOWN);
  useEffect(() => {
    if (enabled) void loadSessionIdentity();
  }, [enabled]);
  return identity;
}
