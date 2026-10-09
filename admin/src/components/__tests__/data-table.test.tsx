import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DataTable } from '../DataTable';
import { annotateTables } from '../useLegacyTableCards';

type Row = { id: string; name: string; amount: number };
const rows: Row[] = [{ id: '1', name: 'Alpha', amount: 5 }, { id: '2', name: 'Beta', amount: 7 }];
const columns = [
  { key: 'name', header: 'الاسم', render: (r: Row) => r.name },
  { key: 'amount', header: 'المبلغ', render: (r: Row) => r.amount },
  { key: 'act', header: 'إجراء', actions: true, render: (r: Row) => <button>{r.id}</button> },
];

describe('DataTable', () => {
  it('renders the card hooks the phone CSS relies on: first column title, label/value pairs, actions last', () => {
    const html = renderToStaticMarkup(<DataTable rows={rows} columns={columns} getRowKey={(r) => r.id} />);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table')!;
    expect(table.hasAttribute('data-cards')).toBe(true);
    expect(doc.querySelectorAll('thead th')).toHaveLength(3);
    const cells = doc.querySelectorAll('tbody tr:first-child td');
    expect(cells[0].getAttribute('data-label')).toBe('الاسم');
    expect(cells[1].getAttribute('data-label')).toBe('المبلغ');
    expect(cells[2].hasAttribute('data-actions')).toBe(true);
    expect(cells[2].hasAttribute('data-label')).toBe(false);
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows loading and empty rows as a single full-width note row', () => {
    const loading = new DOMParser().parseFromString(renderToStaticMarkup(<DataTable rows={rows} columns={columns} getRowKey={(r) => r.id} loading loadingText="..." />), 'text/html');
    expect(loading.querySelector('tr[data-cards-note] td')?.getAttribute('colspan')).toBe('3');
    expect(loading.querySelector('tr[data-cards-note] td')?.textContent).toBe('...');
    const empty = new DOMParser().parseFromString(renderToStaticMarkup(<DataTable rows={[]} columns={columns} getRowKey={(r: Row) => r.id} emptyText="فارغ" />), 'text/html');
    expect(empty.querySelector('tr[data-cards-note] td')?.textContent).toBe('فارغ');
  });
});

describe('annotateTables (legacy tables to cards)', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('labels cells from a single header row and flags full-width note rows', () => {
    document.body.innerHTML = '<table id="t"><thead><tr><th>A</th><th>B</th><th></th></tr></thead><tbody><tr><td>1</td><td>2</td><td><button>x</button></td></tr><tr><td colspan="3">empty</td></tr></tbody></table>';
    annotateTables(document.body);
    const t = document.getElementById('t')!;
    expect(t.getAttribute('data-cards')).toBe('legacy');
    const tds = t.querySelectorAll('tbody tr:first-child td');
    expect(tds[0].getAttribute('data-label')).toBe('A');
    expect(tds[1].getAttribute('data-label')).toBe('B');
    expect(tds[2].hasAttribute('data-actions')).toBe(true);
    expect(t.querySelector('tbody tr:nth-child(2)')!.hasAttribute('data-cards-note')).toBe(true);
  });

  it('leaves tables with grouped (colspan/rowspan) headers or several header rows as scrollers', () => {
    document.body.innerHTML = '<table id="a"><thead><tr><th colspan="2">G</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table><table id="b"><thead><tr><th>A</th></tr><tr><th>B</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
    annotateTables(document.body);
    expect(document.getElementById('a')!.hasAttribute('data-cards')).toBe(false);
    expect(document.getElementById('b')!.hasAttribute('data-cards')).toBe(false);
  });

  it('does not touch tables that opt out or that are already DataTables', () => {
    document.body.innerHTML = '<table id="n" data-no-cards><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
    annotateTables(document.body);
    expect(document.getElementById('n')!.hasAttribute('data-cards')).toBe(false);
  });
});
