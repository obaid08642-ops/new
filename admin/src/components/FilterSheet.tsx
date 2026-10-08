import React, { useRef, useState } from 'react';
import { useDrawer } from './useDrawer';
import { useMediaQuery } from './useMediaQuery';

/**
 * Filter bar wrapper. From 768 px up the children render inline exactly as before; on phones they sit
 * behind a "filter" button and open in a bottom sheet (focus trap, Escape, backdrop, scroll lock).
 */
export function FilterSheet({ children, label = 'تصفية', closeLabel = 'إغلاق', applyLabel = 'تطبيق', className }: {
  children: React.ReactNode;
  label?: string;
  closeLabel?: string;
  applyLabel?: string;
  className?: string;
}) {
  const wide = useMediaQuery('(min-width: 768px)', true);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetOpen = open && !wide;
  useDrawer(sheetOpen, () => setOpen(false), panelRef);

  if (wide) return <div className={className}>{children}</div>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} className="min-h-11 rounded-lg border px-4 text-sm font-bold">
        {label}
      </button>
      {sheetOpen ? (
        <div className="fixed inset-0 z-50" data-testid="filter-sheet">
          <div className="absolute inset-0 bg-slate-950/50" aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-2xl">
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="flex flex-col gap-3 [&_input]:w-full [&_select]:w-full">{children}</div>
            </div>
            <div className="flex gap-2 border-t p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white">{applyLabel}</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border px-4 text-sm">{closeLabel}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
