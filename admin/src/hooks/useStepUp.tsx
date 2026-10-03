import { useCallback, useRef, useState } from 'react';
import StepUpModal, { type StepUpPhase } from '../components/StepUpModal';
import { StepUpError, requestStepUpToken, withStepUp } from '../lib/step-up';

interface DialogState {
  action: string;
  label: string;
  phase: StepUpPhase;
  errorText: string | null;
  noPasskey: boolean;
}

interface PendingChallenge {
  resolve: (token: string | null) => void;
}

/**
 * R23a — reusable step-up flow for sensitive admin actions.
 *
 * Usage per page:
 *   const stepUp = useStepUp();
 *   await stepUp.withStepUp(bffPath, 'POST', 'وصف العملية', (headers) =>
 *     adminFetch(bffPath, { method: 'POST', body: JSON.stringify(body), headers }));
 *   // ... and render {stepUp.modal} once near the page root.
 *
 * On a 403 step_up_required/step_up_invalid the modal prompts for a passkey,
 * exchanges the assertion for a token (memory only), and retries the original
 * request exactly once with `x-step-up-token`.
 */
export function useStepUp() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const pendingRef = useRef<PendingChallenge | null>(null);

  const closeWith = useCallback((token: string | null) => {
    pendingRef.current?.resolve(token);
    pendingRef.current = null;
    setDialog(null);
  }, []);

  const ensureToken = useCallback(
    (action: string, label: string): Promise<string | null> => {
      if (typeof window === 'undefined') return Promise.resolve(null);
      // Never stack two ceremonies (no loops, no double prompts).
      if (pendingRef.current) return Promise.resolve(null);
      return new Promise<string | null>((resolve) => {
        pendingRef.current = { resolve };
        setDialog({ action, label, phase: 'confirm', errorText: null, noPasskey: false });
      });
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    const current = pendingRef.current;
    setDialog((prev) => (prev ? { ...prev, phase: 'verifying', errorText: null, noPasskey: false } : prev));
    try {
      const action = dialog?.action || '';
      const token = await requestStepUpToken(action);
      closeWith(token);
    } catch (reason) {
      if (reason instanceof StepUpError && reason.code === 'cancelled') {
        // User dismissed the browser prompt — close quietly, keep original error.
        closeWith(null);
        return;
      }
      const noPasskey = reason instanceof StepUpError && reason.code === 'no_passkey';
      const message =
        reason instanceof StepUpError
          ? reason.message
          : 'فشل التحقق بمفتاح الأمان.';
      setDialog((prev) => (prev ? { ...prev, phase: 'error', errorText: message, noPasskey } : prev));
      // Keep the pending resolver so the user can close (resolve null) — the
      // modal stays until they explicitly dismiss it. No auto-retry.
      void current;
    }
  }, [closeWith, dialog?.action]);

  const handleCancel = useCallback(() => {
    closeWith(null);
  }, [closeWith]);

  const runWithStepUp = useCallback(
    <T,>(
      bffPath: string,
      method: string,
      label: string,
      run: (extraHeaders: Record<string, string>) => Promise<T>,
    ): Promise<T> => withStepUp(bffPath, method, run, (action) => ensureToken(action, label)),
    [ensureToken],
  );

  const modal = dialog ? (
    <StepUpModal
      open
      phase={dialog.phase}
      actionLabel={dialog.label}
      errorText={dialog.errorText}
      noPasskey={dialog.noPasskey}
      onConfirm={() => void handleConfirm()}
      onCancel={handleCancel}
    />
  ) : null;

  return { withStepUp: runWithStepUp, ensureToken, modal };
}
