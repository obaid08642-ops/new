/**
 * P15.3 — optimistic UI only where it is safe.
 *
 * The plan's split, enforced in code rather than by convention:
 *
 *   optimistic (apply now, roll back + toast on failure):
 *     cart add / remove / quantity, wishlist, reminders on/off, mark as read, likes
 *
 *   NEVER optimistic (show "processing" and wait for the server):
 *     payment, booking, prescription, emergency
 *
 * A payment or a booking must never appear to have succeeded before the server
 * says so — the user would leave the screen believing a charge went through when
 * it did not, and a rolled-back "success" on a charge is not something a toast
 * can fix.
 *
 * Framework-free on purpose: the React hook in `use-optimistic-action.ts` is a
 * thin wrapper, so the rollback rule is testable in this repo's node-only vitest
 * environment.
 */

export const SAFE_OPTIMISTIC_KINDS = ["cart", "wishlist", "reminder", "notification", "like"] as const;
export const NEVER_OPTIMISTIC_KINDS = ["payment", "booking", "prescription", "emergency"] as const;

export type SafeOptimisticKind = (typeof SAFE_OPTIMISTIC_KINDS)[number];
export type NeverOptimisticKind = (typeof NEVER_OPTIMISTIC_KINDS)[number];
export type ActionKind = SafeOptimisticKind | NeverOptimisticKind;

export function isNeverOptimistic(kind: string): boolean {
  return (NEVER_OPTIMISTIC_KINDS as readonly string[]).includes(kind);
}

export function isSafeOptimistic(kind: string): boolean {
  return (SAFE_OPTIMISTIC_KINDS as readonly string[]).includes(kind);
}

/** What the UI should show while the action is in flight. Deny by default: a
 * kind applies optimistically ONLY when it is on the safe allowlist. An
 * unknown or typo'd kind (e.g. `"paymnt"`) renders "processing" and never
 * touches local state — a misspelled payment must fail safe, not optimistic.
 * The never-list stays as defense in depth (explicit documentation of the
 * kinds that must never be optimistic even if the allowlist is ever widened).
 */
export function pendingMode(kind: string): "optimistic" | "processing" {
  if (isNeverOptimistic(kind)) return "processing";
  return isSafeOptimistic(kind) ? "optimistic" : "processing";
}

export type ToastSink = (toast: { kind: "error" | "success" | "info"; title: string; message: string; reference?: string }) => void;

export type OptimisticRun<T> = {
  kind: string;
  /** The instant, local change. Never called for a never-optimistic kind. */
  apply: () => void;
  /** Undoes `apply`. Never called for a never-optimistic kind. */
  rollback: () => void;
  /** The real server write. */
  commit: () => Promise<T>;
  toast: ToastSink;
  /**
   * `messageFor` is a callback, not a string: a 409 and a 500 must not read the
   * same to the person who just lost their change.
   */
  copy: {
    rollbackTitle: string;
    failedTitle: string;
    messageFor: (error: unknown) => string;
  };
  /** Called after the server confirms, for both modes. */
  onCommitted?: (value: T) => void;
};

export type OptimisticOutcome<T> =
  | { status: "committed"; optimistic: boolean; value: T }
  | { status: "rolled_back"; optimistic: true; error: unknown }
  | { status: "failed"; optimistic: false; error: unknown }
  | { status: "queued"; optimistic: true; error?: undefined };

/**
 * The single runner. `apply` happens synchronously only when the kind allows it;
 * a failure then rolls the change back and explains it in a toast. A
 * never-optimistic kind never touches local state — it just waits, and reports
 * a failure without pretending anything changed.
 */
export async function runOptimistic<T>(run: OptimisticRun<T>): Promise<OptimisticOutcome<T>> {
  // F1 deny-by-default: the allowlist decides. The never-list is checked inside
  // `pendingMode` as defense in depth, but `apply` runs ONLY for safe kinds.
  const optimistic = isSafeOptimistic(run.kind);

  if (optimistic) {
    try {
      run.apply();
    } catch (cause) {
      // A local failure is still a failure the user must see.
      run.toast({ kind: "error", title: run.copy.failedTitle, message: run.copy.messageFor(cause) });
      return { status: "rolled_back", optimistic: true, error: cause };
    }
  }

  try {
    const value = await run.commit();
    run.onCommitted?.(value);
    return { status: "committed", optimistic, value };
  } catch (error) {
    if (optimistic) {
      run.rollback();
      run.toast({ kind: "error", title: run.copy.rollbackTitle, message: run.copy.messageFor(error) });
      return { status: "rolled_back", optimistic: true, error };
    }
    run.toast({ kind: "error", title: run.copy.failedTitle, message: run.copy.messageFor(error) });
    return { status: "failed", optimistic: false, error };
  }
}

/**
 * P15.4 seam: a safe action taken while offline is queued instead of lost. The
 * caller decides that; this only reports whether the failure is the offline one.
 */
export function isOfflineFailure(error: unknown): boolean {
  const reason = (error as { reason?: string } | null)?.reason;
  return reason === "offline" || reason === "network";
}

/**
 * P15.4 — queue instead of sending when there is no network to send on.
 * Only safe kinds ever queue: a payment must fail loudly now, never replay
 * silently later.
 */
export function shouldQueueOffline(kind: string, offline: boolean): boolean {
  return offline && isSafeOptimistic(kind);
}
