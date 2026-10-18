/**
 * 15.3 — optimistic updates, only where they are safe.
 *
 * SAFE (use this helper): cart add/remove/quantity, wishlist, reminders on/off, mark as read, likes. The change is shown at
 * once; if the server refuses (or cannot be reached) the change is undone and the person is told, so the screen never keeps
 * a state the server does not have.
 *
 * NEVER (do not use this helper, show "processing" until the server confirms): payment, booking, prescription, emergency.
 * `optimistic.guard.test.ts` fails if a file of those areas imports this module.
 */
export type OptimisticResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function optimistic<T>(change: {
  /** Show the new state now. */
  apply: () => void;
  /** Ask the server. Must reject on any failure, including an unreachable server. */
  request: () => Promise<T>;
  /** Put the screen back as it was. Called once, only when the request failed. */
  rollback: (error: unknown) => void;
  /** Tell the person (a toast). Called once after the rollback. */
  onFail?: (error: unknown) => void;
}): Promise<OptimisticResult<T>> {
  change.apply();
  try {
    return { ok: true, value: await change.request() };
  } catch (error) {
    change.rollback(error);
    try {
      change.onFail?.(error);
    } catch {
      /* telling the person must not undo the undo */
    }
    return { ok: false, error };
  }
}
