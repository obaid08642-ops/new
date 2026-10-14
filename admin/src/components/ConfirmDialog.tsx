import React, { useEffect, useRef } from 'react';

/**
 * Confirmation step for sensitive changes (price, prescription flag...). The safe button (cancel) gets the focus,
 * Escape and the backdrop cancel, Tab stays inside the dialog.
 */
export function ConfirmDialog({ open, title, children, confirmLabel = 'تأكيد', cancelLabel = 'تراجع', busy, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = React.useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    cancelButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onCancel(); return; }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, a[href]'));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); opener?.focus?.(); };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} dir="rtl" onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-black text-slate-900">{title}</h2>
        <div className="space-y-2 text-sm text-slate-700">{children}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onConfirm} disabled={busy} className="flex-1 rounded-lg bg-teal-600 py-2 font-bold text-white hover:bg-teal-700 disabled:opacity-50">{confirmLabel}</button>
          <button type="button" ref={cancelButton} onClick={onCancel} disabled={busy} className="flex-1 rounded-lg bg-gray-200 py-2 font-bold text-gray-800 disabled:opacity-50">{cancelLabel}</button>
        </div>
      </div>
    </div>
  );
}
