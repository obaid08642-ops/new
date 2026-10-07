"use client";

/**
 * P15.3 — the toast store.
 *
 * A 40-line observable store rather than a dependency, because the rule that
 * matters here ("on failure, roll back AND show a toast") has to be unit-testable
 * in this repo's node-only vitest environment, where a DOM toast library cannot
 * render. `components-next/network/toast-viewport.tsx` renders it.
 */

export type ToastKind = "error" | "success" | "info";

export type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
  /** Optional support reference, shown small under the message. */
  reference?: string;
};

const toasts: Toast[] = [];
const listeners = new Set<(next: Toast[]) => void>();
let nextId = 1;

function publish(): void {
  // A copy, so a React subscriber can compare snapshots by identity.
  const snapshot = [...toasts];
  for (const listener of [...listeners]) listener(snapshot);
}

export function showToast(toast: Omit<Toast, "id">): number {
  const id = nextId++;
  toasts.push({ ...toast, id });
  publish();
  return id;
}

export function dismissToast(id: number): void {
  const at = toasts.findIndex((toast) => toast.id === id);
  if (at < 0) return;
  toasts.splice(at, 1);
  publish();
}

export function getToasts(): Toast[] {
  return [...toasts];
}

export function subscribeToasts(listener: (next: Toast[]) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only. */
export function clearToasts(): void {
  toasts.length = 0;
  publish();
}
