import Link from 'next/link';

export type StepUpPhase = 'confirm' | 'verifying' | 'error';

interface StepUpModalProps {
  open: boolean;
  phase: StepUpPhase;
  actionLabel: string;
  errorText: string | null;
  noPasskey: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * R23a — passkey step-up prompt. Presentational only; the ceremony state
 * machine lives in `useStepUp`. Never auto-retries (no loops): on error the
 * user either cancels or re-invokes the page action for a single re-challenge.
 */
export default function StepUpModal({ open, phase, actionLabel, errorText, noPasskey, onConfirm, onCancel }: StepUpModalProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="تحقق مشدّد بمفتاح الأمان" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div dir="rtl" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold">تحقق مشدّد مطلوب</h2>
        <p className="mt-2 text-sm text-slate-600">
          العملية <strong>{actionLabel}</strong> حساسة وتتطلب تأكيداً جديداً ببصمتك (Face ID / Touch ID / رمز القفل) قبل التنفيذ.
        </p>

        {phase === 'error' ? (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorText || 'فشل التحقق المشدّد.'}
          </p>
        ) : null}

        {phase === 'error' && noPasskey ? (
          <p className="mt-3 text-sm text-slate-600">
            لا يوجد مفتاح أمان مسجّل لهذا الحساب. سجّل جهازك من صفحة{' '}
            <Link href="/admin/security" className="font-bold text-teal-700 underline">الأمان ومفاتيح الدخول</Link>{' '}
            ثم أعد المحاولة — لن تُعاد المطالبة تلقائياً.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={phase === 'verifying'} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
            {phase === 'error' ? 'إغلاق' : 'إلغاء'}
          </button>
          {phase !== 'error' ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={phase === 'verifying'}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {phase === 'verifying' ? 'بانتظار البصمة…' : 'تأكيد بالبصمة'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
