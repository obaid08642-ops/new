"use client";

/**
 * P15.1 — "when did we last have real data?", recorded by the network layer.
 *
 * 15.4 renders it next to the offline banner. It has to come from the client
 * rather than a page, because the page that shows cached content offline is
 * exactly the page whose fetch already failed.
 */

export const LAST_SYNC_STORAGE_KEY = "nabd_network_last_sync_v1";

export type LastSyncListener = (atMs: number | null) => void;

let lastSyncedAt: number | null = null;
let hydrated = false;
const listeners = new Set<LastSyncListener>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Safari in private mode throws on access, not just on write.
    return null;
  }
}

function publish(atMs: number | null): void {
  lastSyncedAt = atMs;
  for (const listener of [...listeners]) listener(atMs);
}

/** Reads the persisted value once per page load; SSR renders "unknown". */
export function hydrateLastSync(): number | null {
  if (hydrated) return lastSyncedAt;
  hydrated = true;
  const raw = storage()?.getItem(LAST_SYNC_STORAGE_KEY);
  const parsed = raw ? Number(raw) : Number.NaN;
  lastSyncedAt = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return lastSyncedAt;
}

export function getLastSyncedAt(): number | null {
  return lastSyncedAt;
}

export function subscribeLastSync(listener: LastSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markSynced(atMs: number = Date.now()): void {
  if (!Number.isFinite(atMs) || atMs <= 0) return;
  lastSyncedAt = atMs;
  hydrated = true;
  try {
    storage()?.setItem(LAST_SYNC_STORAGE_KEY, String(atMs));
  } catch {
    /* private mode / quota — the in-memory value still drives the banner */
  }
  for (const listener of [...listeners]) listener(atMs);
}

/** Wired into `apiFetch` by `install.ts`. Only a real, complete answer counts. */
export function noteResponse(response: Response, _attempt = 0): void {
  if (response.ok) markSynced();
}
