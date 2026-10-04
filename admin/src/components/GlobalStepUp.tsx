import { useEffect } from 'react';
import { useStepUp } from '../hooks/useStepUp';
import { setStepUpPrompt } from '../lib/step-up-registry';

/**
 * R23: one step-up prompt for every admin page. The shared fetch helpers call
 * it when a @StepUp route answers 403 step_up_required, then retry once.
 */
export function GlobalStepUp() {
  const stepUp = useStepUp();
  const { ensureToken } = stepUp;
  useEffect(() => {
    setStepUpPrompt((action) => ensureToken(action, 'تأكيد عملية حساسة بمفتاح الأمان'));
    return () => setStepUpPrompt(null);
  }, [ensureToken]);
  return stepUp.modal;
}
