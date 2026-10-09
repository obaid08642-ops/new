import React from 'react';

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  /** Plain-text label shown beside the value in card mode (defaults to `header` when it is a string). */
  label?: string;
  render: (row: T) => React.ReactNode;
  /** Extra classes for the cell. */
  className?: string;
  /** Row actions: rendered last, full width, without a label in card mode. */
  actions?: boolean;
};

/**
 * Admin data table. At >= 768 px: the usual table (same look as the hand-written ones). Under 768 px the
 * CSS in globals.css (`table[data-cards]`) lays each row out as a card: the first column is the card
 * title, every other cell is a label/value pair taken from `data-label`, actions go last.
 */
export function DataTable<T>({ columns, rows, getRowKey, loading, loadingText = 'جارٍ التحميل…', emptyText = 'لا توجد بيانات.', caption, className = '' }: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  caption?: string;
  className?: string;
}) {
  const labelOf = (c: DataTableColumn<T>) => c.label ?? (typeof c.header === 'string' ? c.header : '');
  return (
    <div className={`overflow-x-auto rounded-2xl border bg-white shadow-sm ${className}`}>
      <table data-cards="" className="min-w-full text-right text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className="p-4">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {loading || !rows.length ? (
            <tr data-cards-note=""><td colSpan={columns.length} className="p-10 text-center text-slate-500">{loading ? loadingText : emptyText}</td></tr>
          ) : rows.map((row) => (
            <tr key={getRowKey(row)} className="border-t">
              {columns.map((c) => (
                <td key={c.key} data-label={c.actions ? undefined : labelOf(c)} data-actions={c.actions ? '' : undefined} className={`p-4 ${c.className ?? ''}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
