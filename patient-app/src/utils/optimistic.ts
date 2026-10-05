/**
 * 15.3 — optimistic UI, only where it is safe.
 *
 * Two rules, and this module is where they are enforced:
 *
 *   1. A SAFE action (cart quantity, wishlist, reminder on/off, mark as read,
 *      like) may be applied to local state before the server answers. If the
 *      server refuses, the previous state is restored and the failure is
 *      explained. It is never left silently wrong.
 *
 *   2. A CRITICAL action (payment, booking, prescription, emergency) is NEVER
 *      applied optimistically. It shows a "processing" state until the server
 *      confirms, because a false "paid" or "booked" is a clinical and financial
 *      harm, not a cosmetic one. `runOptimistic` refuses to run for a critical
 *      kind at all — the guard is a throw, not a comment, so the rule survives
 *      future edits.
 *
 * The core is deliberately framework-free so it can be unit-tested without
 * rendering anything; `useOptimisticMutation` is a thin React binding.
 */
import { describeError } from '../services/http/errors';

/** Actions whose local state may be changed before the server confirms. */
export type OptimisticKind = 'cart' | 'wishlist' | 'reminder' | 'mark-read' | 'like';

/**
 * Actions that must never be optimistic. A local "paid" or "booked" that the
 * server rejects is worse than a spinner.
 */
export type CriticalKind = 'payment' | 'booking' | 'prescription' | 'emergency';

export const CRITICAL_KINDS: readonly CriticalKind[] = ['payment', 'booking', 'prescription', 'emergency'];

/**
 * F1 — deny-by-default allowlist. `runOptimistic` may apply ONLY these kinds.
 * A new or typo'd kind (`"order"`, `"paymnt"`) is refused rather than getting
 * an instant false-success UI. `CRITICAL_KINDS` above stays as defense in depth
 * (it is also the gate the outbox enforces) and as documentation of WHY the
 * refusal exists for the dangerous four.
 */
export const SAFE_OPTIMISTIC_KINDS: readonly OptimisticKind[] = [
  'cart',
  'wishlist',
  'reminder',
  'mark-read',
  'like',
];

export function isSafeOptimistic(kind: string): boolean {
  return (SAFE_OPTIMISTIC_KINDS as readonly string[]).includes(kind);
}

export class OptimisticNotAllowedError extends Error {
  readonly kind: string;
  constructor(kind: string) {
    super(`optimistic_update_forbidden_for_${kind}`);
    this.name = 'OptimisticNotAllowedError';
    this.kind = kind;
  }
}

export function assertOptimisticAllowed(kind: string): void {
  // Deny-by-default: only the allowlist passes. The never-list check stays so
  // the refusal reason for a critical kind is explicit rather than incidental.
  if ((CRITICAL_KINDS as readonly string[]).includes(kind)) {
    throw new OptimisticNotAllowedError(kind);
  }
  if (!isSafeOptimistic(kind)) {
    throw new OptimisticNotAllowedError(kind);
  }
}

export interface OptimisticFailure {
  ok: false;
  error: unknown;
  /** Localized, from the 13.R5 catalogue. */
  message: string;
  nextStep: string;
  /** True when the local state was restored. */
  rolledBack: boolean;
}

export interface OptimisticSuccess<TResult> {
  ok: true;
  result: TResult;
}

export type OptimisticOutcome<TResult> = OptimisticSuccess<TResult> | OptimisticFailure;

export interface RunOptimisticParams<TState, TResult> {
  /** Which rule applies. Throws for a critical kind. */
  kind: string;
  /** Read the current state before it is changed. */
  read: () => TState;
  /** Write the new state (a `setState`). */
  write: (next: TState) => void;
  /** Compute the optimistic state from the current one. */
  apply: (current: TState) => TState;
  /** Persist to the server. Rejecting triggers the rollback. */
  commit: () => Promise<TResult>;
  /** Optional custom restore; defaults to the snapshot taken before `apply`. */
  rollback?: (snapshot: TState) => TState;
  /** Optional custom explanation; defaults to the catalogue message + next step. */
  explain?: (error: unknown) => { message: string; nextStep: string };
  locale?: string;
}

/**
 * Apply → commit → (on failure) restore and explain.
 *
 * A rollback failure is reported, not swallowed: if `write` throws while
 * restoring, the caller still gets a failure object with `rolledBack: false` so
 * it can force a reload rather than leave the UI lying.
 */
export async function runOptimistic<TState, TResult>(
  params: RunOptimisticParams<TState, TResult>,
): Promise<OptimisticOutcome<TResult>> {
  assertOptimisticAllowed(params.kind);

  const snapshot = params.read();
  params.write(params.apply(snapshot));

  try {
    const result = await params.commit();
    return { ok: true, result };
  } catch (error) {
    let rolledBack = true;
    try {
      params.write(params.rollback ? params.rollback(snapshot) : snapshot);
    } catch {
      rolledBack = false;
    }
    const explanation = params.explain
      ? params.explain(error)
      : describeError(error, params.locale ?? 'ar');
    return { ok: false, error, message: explanation.message, nextStep: explanation.nextStep, rolledBack };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Critical (never-optimistic) actions
// ─────────────────────────────────────────────────────────────────────────────

export interface RunCommittedParams<TResult> {
  kind: CriticalKind | string;
  /** Called when the write starts, to show the "processing" state. */
  onProcessing?: (processing: boolean) => void;
  commit: () => Promise<TResult>;
  explain?: (error: unknown) => { message: string; nextStep: string };
  locale?: string;
  onSuccess?: (result: TResult) => void;
  onFailure?: (failure: OptimisticFailure) => void;
}

export interface CommittedOutcome<TResult> {
  /** True only when the server confirmed. Nothing local was changed before this. */
  confirmed: boolean;
  result?: TResult;
  message?: string;
  nextStep?: string;
}

/**
 * Run a critical write. `onProcessing(true)` is held from before the request
 * until the server answers, so the user sees "processing" rather than a success
 * the backend never granted.
 */
export async function runCommitted<TResult>(params: RunCommittedParams<TResult>): Promise<CommittedOutcome<TResult>> {
  params.onProcessing?.(true);
  try {
    const result = await params.commit();
    params.onSuccess?.(result);
    return { confirmed: true, result };
  } catch (error) {
    const explanation = params.explain
      ? params.explain(error)
      : describeError(error, params.locale ?? 'ar');
    const failure: OptimisticFailure = {
      ok: false,
      error,
      message: explanation.message,
      nextStep: explanation.nextStep,
      rolledBack: false,
    };
    params.onFailure?.(failure);
    return { confirmed: false, message: failure.message, nextStep: failure.nextStep };
  } finally {
    params.onProcessing?.(false);
  }
}

/** Arabic copy for the two states 15.3 requires, so they are not retyped per screen. */
export const PROCESSING_COPY = {
  ar: {
    processing: 'جارٍ المعالجة… لا تغلق الشاشة',
    processingPayment: 'جارٍ تأكيد الدفع… لا تُغلق الشاشة',
    rolledBack: 'تم التراجع عن التغيير',
  },
  en: {
    processing: 'Processing… do not close the screen',
    processingPayment: 'Confirming payment… do not close the screen',
    rolledBack: 'The change was rolled back',
  },
} as const;

export function processingCopy(locale: string | undefined, payment = false) {
  const table = locale === 'en' ? PROCESSING_COPY.en : PROCESSING_COPY.ar;
  return payment ? table.processingPayment : table.processing;
}
