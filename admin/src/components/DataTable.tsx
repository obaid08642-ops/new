import React from 'react';

/** Rows that come straight from untyped admin API payloads (the pages read them field by field). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LooseRow = Record<string, any>;
export type LooseValue = LooseRow[string];

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  /** Plain-text label shown beside the value in card mode (defaults to `header` when it is a string). */
  label?: string;
  render: (row: T) => React.ReactNode;
  /** Extra classes for the header cell. */
  headerClassName?: string;
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
export function DataTable<T>({ columns, rows, getRowKey, loading, loadingText = 'جارٍ التحميل…', emptyText = 'لا توجد بيانات.', caption, className = '', bare, dense, dir, rowClassName, onRowClick, expandedRow, footerRow }: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  caption?: string;
  className?: string;
  /** No own frame (the table already sits inside a card). */
  bare?: boolean;
  /** Tighter cell padding (p-3). */
  dense?: boolean;
  /** Text direction of the table (some ledgers are LTR). */
  dir?: 'ltr' | 'rtl';
  rowClassName?: (row: T) => string;
  /** Whole-row click (adds a pointer cursor). */
  onRowClick?: (row: T) => void;
  /** Optional full-width row rendered under a row (e.g. an inline form); return null for none. */
  expandedRow?: (row: T) => React.ReactNode;
  /** Full-width last row (totals); shown only when there are rows. */
  footerRow?: React.ReactNode;
}) {
  const labelOf = (c: DataTableColumn<T>) => c.label ?? (typeof c.header === 'string' ? c.header : '');
  const pad = dense ? 'p-3' : 'p-4';
  return (
    <div className={`overflow-x-auto ${bare ? '' : 'rounded-2xl border bg-white shadow-sm'} ${className}`}>
      <table data-cards="" dir={dir} className={`min-w-full text-sm ${dir === 'ltr' ? 'text-left' : 'text-right'}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={`${pad} ${c.headerClassName ?? ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {loading || !rows.length ? (
            <tr data-cards-note=""><td colSpan={columns.length} className={`${dense ? 'p-6' : 'p-10'} text-center text-slate-500`}>{loading ? loadingText : emptyText}</td></tr>
          ) : rows.map((row) => {
            const extra = expandedRow ? expandedRow(row) : null;
            return (
              <React.Fragment key={getRowKey(row)}>
                <tr className={`border-t ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.actions ? undefined : labelOf(c)} data-actions={c.actions ? '' : undefined} className={`${pad} ${c.className ?? ''}`}>{c.render(row)}</td>
                  ))}
                </tr>
                {extra ? <tr data-cards-note=""><td colSpan={columns.length} className="p-0">{extra}</td></tr> : null}
              </React.Fragment>
            );
          })}
          {!loading && rows.length && footerRow ? <tr data-cards-note="" className="border-t"><td colSpan={columns.length} className="p-0">{footerRow}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
