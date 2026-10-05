/**
 * 15.3 — React binding for `runOptimistic` / `runCommitted`.
 *
 * `useOptimisticMutation` gives a screen the three things 15.3 asks for at once:
 *   - the local change applied immediately,
 *   - `pending` so the control can be disabled while the write is in flight
 *     (15.2's "no double actions" shares this flag),
 *   - on failure, a toast carrying the 13.R5 catalogue message and next step.
 *
 * `useCommittedMutation` is the counterpart for payment / booking / prescription /
 * emergency: no local change at all, just a `processing` flag held until the
 * server answers.
 */
import { useCallback, useRef, useState } from 'react';
import { useToast } from '../design-system';
import {
  OptimisticNotAllowedError,
  runCommitted,
  runOptimistic,
  PROCESSING_COPY,
  processingCopy,
  type CommittedOutcome,
  type OptimisticFailure,
  type OptimisticOutcome,
} from '../utils/optimistic';

export interface UseOptimisticMutationOptions<TState> {
  kind: string;
  read: () => TState;
  write: (next: TState) => void;
  apply: (current: TState) => TState;
  rollback?: (snapshot: TState) => TState;
  locale?: string;
  /** Set false to suppress the automatic error toast (e.g. a screen with its own banner). */
  toastOnError?: boolean;
  onSuccess?: () => void;
}

export interface UseOptimisticMutationResult<TState, TResult> {
  run: (commit: () => Promise<TResult>) => Promise<OptimisticOutcome<TResult>>;
  pending: boolean;
}

export function useOptimisticMutation<TState, TResult = unknown>(
  options: UseOptimisticMutationOptions<TState>,
): UseOptimisticMutationResult<TState, TResult> {
  const toast = useToastSafely();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(
    async (commit: () => Promise<TResult>): Promise<OptimisticOutcome<TResult>> => {
      // A second tap while the first write is in flight must not double-apply.
      if (inFlight.current) return { ok: false, error: null, message: '', nextStep: '', rolledBack: false };
      inFlight.current = true;
      setPending(true);
      try {
        const outcome = await runOptimistic<TState, TResult>({
          kind: optionsRef.current.kind,
          read: optionsRef.current.read,
          write: optionsRef.current.write,
          apply: optionsRef.current.apply,
          rollback: optionsRef.current.rollback,
          locale: optionsRef.current.locale,
          commit,
        });
        if (outcome.ok) {
          optionsRef.current.onSuccess?.();
        } else if (optionsRef.current.toastOnError !== false && toast) {
          const copy = optionsRef.current.locale === 'en' ? PROCESSING_COPY.en : PROCESSING_COPY.ar;
          toast.show({
            type: 'error',
            title: copy.rolledBack,
            message: `${outcome.message} ${outcome.nextStep}`.trim(),
          });
        }
        return outcome;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [toast],
  );

  return { run, pending };
}

export interface UseCommittedMutationOptions {
  kind: string;
  /** True for payment, so the copy says "confirming payment". */
  payment?: boolean;
  locale?: string;
  onSuccess?: () => void;
  onFailure?: (failure: OptimisticFailure) => void;
  toastOnError?: boolean;
}

export interface UseCommittedMutationResult<TResult> {
  /** Show "processing" until the server confirms. Never optimistically true. */
  run: (commit: () => Promise<TResult>) => Promise<CommittedOutcome<TResult>>;
  processing: boolean;
}

export function useCommittedMutation<TResult = unknown>(
  options: UseCommittedMutationOptions,
): UseCommittedMutationResult<TResult> {
  const toast = useToastSafely();
  const [processing, setProcessing] = useState(false);
  const inFlight = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const run = useCallback(
    async (commit: () => Promise<TResult>): Promise<CommittedOutcome<TResult>> => {
      if (inFlight.current) return { confirmed: false };
      inFlight.current = true;
      try {
        return await runCommitted<TResult>({
          kind: optionsRef.current.kind,
          onProcessing: setProcessing,
          onSuccess: optionsRef.current.onSuccess,
          onFailure: (failure) => {
            optionsRef.current.onFailure?.(failure);
            if (optionsRef.current.toastOnError !== false && toast) {
              toast.show({ type: 'error', message: `${failure.message} ${failure.nextStep}`.trim() });
            }
          },
          commit,
          locale: optionsRef.current.locale,
        });
      } finally {
        inFlight.current = false;
      }
    },
    [toast],
  );

  return { run, processing };
}

/**
 * `useToast` throws outside a `ToastProvider`. Screens rendered in isolation (and
 * unit tests) must still be able to roll back, so the absence of a toast host is
 * a missing notification, never a crash.
 */
function useToastSafely() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useToast();
  } catch {
    return null;
  }
}

export { OptimisticNotAllowedError, processingCopy };
