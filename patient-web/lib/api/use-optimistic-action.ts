"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { runOptimistic, pendingMode, type OptimisticOutcome } from "./optimistic";
import { showToast } from "./net/toast";
import { useErrorCopy } from "./net/use-error-copy";

/**
 * P15.3 — the React face of `runOptimistic`.
 *
 * `pending` is what the button binds to, and `mode` tells it whether to say
 * "saved" (optimistic) or "processing" (payment / booking / prescription /
 * emergency). The localized failure sentence comes from the 13.R5 catalogue via
 * `useErrorCopy`, so a 500 and a dead connection read differently.
 */
export function useOptimisticAction<T>() {
  const network = useTranslations("Network");
  const resolveCopy = useErrorCopy();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async (
      kind: string,
      actions: { apply: () => void; rollback: () => void; commit: () => Promise<T>; onCommitted?: (value: T) => void },
    ): Promise<OptimisticOutcome<T>> => {
      // No double actions: the button is already disabled, and this is
      // the second line of defence for a fast double tap.
      if (inFlight.current) return { status: "failed", optimistic: false, error: new Error("action_in_flight") };
      inFlight.current = true;
      setPending(true);
      try {
        const outcome = await runOptimistic<T>({
          kind,
          ...actions,
          toast: (toast) => showToast(toast),
          copy: {
            rollbackTitle: network("rollback.title"),
            failedTitle: network("rollback.title"),
            messageFor: (error: unknown) => failureBody(resolveCopy, error),
          },
        });
        return outcome;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [network, resolveCopy],
  );

  return { run, pending, mode: pendingMode };
}

/**
 * The message body for a failed action, resolved from the catalog. Kept separate
 * from the runner so the rollback toast can carry the SERVER's explanation when
 * the body had a catalog code (a 409 DUPLICATE_TRANSACTION reads very differently
 * from a 500).
 */
export function failureBody(copy: (error: unknown) => { message: string; nextStep: string }, error: unknown): string {
  const resolved = copy(error);
  return resolved.nextStep ? `${resolved.message} ${resolved.nextStep}` : resolved.message;
}
