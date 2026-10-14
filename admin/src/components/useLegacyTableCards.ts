import { useEffect } from 'react';

/**
 * Hand-written admin tables (one header row of plain <th>, no rowspan) get the same phone card layout as
 * <DataTable>: this copies each header's text into the cells as `data-label` and flags the table with
 * `data-cards`. Tables that cannot be cards (several header rows, rowspan/colspan headers) are left alone;
 * they stay inside their own horizontal scroller (see globals.css).
 */
export function annotateTables(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>('table:not([data-cards]):not([data-no-cards])').forEach((table) => {
    const headRows = table.tHead?.rows;
    if (!headRows || headRows.length !== 1) return;
    const ths = Array.from(headRows[0].cells);
    if (!ths.length || ths.some((th) => th.colSpan > 1 || th.rowSpan > 1)) return;
    if (table.querySelector('tbody td[rowspan]')) return;
    table.setAttribute('data-cards', 'legacy');
  });
  root.querySelectorAll<HTMLTableElement>('table[data-cards="legacy"]').forEach((table) => {
    const labels = Array.from(table.tHead?.rows[0]?.cells ?? []).map((th) => (th.textContent ?? '').trim());
    Array.from(table.tBodies).forEach((body) => {
      Array.from(body.rows).forEach((row) => {
        if (row.cells.length === 1 && row.cells[0].colSpan > 1) { row.setAttribute('data-cards-note', ''); return; }
        Array.from(row.cells).forEach((cell, i) => {
          const label = labels[i] ?? '';
          if (label) { if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label); }
          else cell.setAttribute('data-actions', '');
        });
      });
    });
  });
}

/** `ready` flips to true once the element behind `rootRef` is mounted. */
export function useLegacyTableCards(rootRef: React.RefObject<HTMLElement | null>, ready: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    let frame = 0;
    const run = () => { frame = 0; annotateTables(root); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [rootRef, ready]);
}
