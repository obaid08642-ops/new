import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { orderDetailTarget } from '../pages/admin/order-detail';

const SRC = resolve(__dirname, '..');
const guard = readFileSync(join(SRC, 'components/AdminGuard.tsx'), 'utf8');
const links = [...guard.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);

function pageFiles(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? pageFiles(p, `${base}/${name}`) : /\.tsx$/.test(name) ? [`${base}/${name.replace(/\.tsx$/, '').replace(/\/index$/, '')}`.replace(/\/index$/, '')] : [];
  });
}
const pages = new Set(pageFiles(join(SRC, 'pages/admin'), '/admin'));

// Pages that are reached from another page or an old link, not from the menu.
const NOT_IN_MENU = new Set(['/admin/order-detail' /* redirect to /admin/orders/:kind/:id */]);

describe('admin sidebar integrity', () => {
  it('every sidebar link opens an existing page', () => {
    const missing = links.filter((h) => h !== '/admin' && !pages.has(h) && !existsSync(join(SRC, 'pages', `${h}.tsx`)));
    expect(missing).toEqual([]);
  });
  it('no link is listed twice', () => {
    expect(links.filter((h, i) => links.indexOf(h) !== i)).toEqual([]);
  });
  it('every static admin page is in the menu or is a known redirect (no orphan pages)', () => {
    const orphans = [...pages].filter((p) => !p.includes('[') && !links.includes(p) && !NOT_IN_MENU.has(p));
    expect(orphans).toEqual([]);
  });
  it('no page links to "#"', () => {
    const bad: string[] = [];
    for (const p of pages) {
      const file = join(SRC, 'pages', `${p}.tsx`);
      const alt = join(SRC, 'pages', p, 'index.tsx');
      const src = readFileSync(existsSync(file) ? file : alt, 'utf8');
      if (/href=(?:"#"|'#'|\{'#'\}|\{"#"\})|:\s*'#'\}/.test(src)) bad.push(p);
    }
    expect(bad).toEqual([]);
  });
});

describe('the old order-detail link keeps working', () => {
  it('goes to the one order page, or to the list when the id is missing', () => {
    expect(orderDetailTarget({ kind: 'lab', id: 'a b' })).toBe('/admin/orders/lab/a%20b');
    expect(orderDetailTarget({ kind: 'lab' })).toBe('/admin/orders');
    expect(orderDetailTarget({})).toBe('/admin/orders');
  });
});
