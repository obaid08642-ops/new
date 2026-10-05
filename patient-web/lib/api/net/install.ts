"use client";

import { apiFetch } from "./client";
import { browserIsOffline } from "./online";
import { noteResponse } from "./last-sync";
import { noteServerDate } from "./server-time";

/**
 * P15.1 — how the ONE client reaches all ~170 existing `fetch(...)` call sites.
 *
 * patient-web has no axios and no shared API helper on the browser side: every
 * component calls the global `fetch` directly (`/api/...` BFF routes, 172 call
 * sites across ~130 files). Hand-editing 172 call sites to import a helper would
 * be the largest possible diff in this app and every one of those files carries a
 * product test, so the policy is installed ONCE over `globalThis.fetch` instead.
 * That is the least invasive consolidation that still makes every call site
 * inherit the policy — see P15_NOTES.md, which says this plainly.
 *
 * The wrapper is transparent: it forwards the resolved `Response` untouched, so
 * existing `.ok` / `.json()` call sites behave exactly as before. The only new
 * visible behaviour is the added deadline, the allowed retries, the offline
 * pre-check, and a typed `ApiError` where the old code got a `TypeError`.
 */

let installed = false;

export type InstallOptions = {
  /** Injected by tests; production uses the real global. */
  target?: { fetch: typeof fetch };
  isOffline?: () => boolean;
};

export function installNetworkPolicy(options: InstallOptions = {}): boolean {
  if (installed) return false;
  if (typeof window === "undefined" && !options.target) return false;

  const target = options.target ?? window;
  const original = target.fetch.bind(target);
  const isOffline = options.isOffline ?? browserIsOffline;

  target.fetch = function policyFetch(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    return apiFetch(input, init ?? {}, {
      fetchImpl: original as (url: string, requestInit: RequestInit) => Promise<Response>,
      isOffline,
      onResponse: (response, attempt) => {
        noteResponse(response, attempt);
        // P15.9: every settled response re-anchors the server clock.
        try {
          noteServerDate(response.headers.get("date"));
        } catch {
          /* a header read must never break the response path */
        }
      },
    });
  };

  installed = true;
  return true;
}

/** Test-only: lets a suite install a fresh policy on a fresh target. */
export function resetNetworkPolicyInstallForTests(): void {
  installed = false;
}
