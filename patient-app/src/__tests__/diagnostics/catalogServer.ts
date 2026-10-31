/**
 * A stand-in for the catalogue endpoints in the hub tests: answers `GET /labs/services` and `GET /radiology/services` the way the backend does
 * (popularity order; page / limit / category / search / home_visit / lowest_price / highest_rated; `{ data, total, page, limit, total_pages }` when `page` is sent,
 * the plain array otherwise; limit defaults to 20 and is capped at 100). TEST values only.
 */
type Row = Record<string, unknown>;

export function serveCatalog(path: string, data: { labs?: Row[]; scans?: Row[]; packages?: Row[] }): unknown {
  const url = new URL(path, 'http://backend.test');
  const q = url.searchParams;
  if (url.pathname === '/labs/packages') return data.packages ?? [];
  const isScan = url.pathname === '/radiology/services';
  if (!isScan && url.pathname !== '/labs/services') return [];
  let rows = [...((isScan ? data.scans : data.labs) ?? [])];
  // the default order is the backend's: most requested first (stable)
  rows.sort((a, b) => Number(b.popularity ?? 0) - Number(a.popularity ?? 0));
  const category = q.get('category');
  if (category) rows = rows.filter((r) => (isScan ? (r.category ?? r.modality) : r.category) === category);
  const search = q.get('search')?.toLowerCase();
  if (search) rows = rows.filter((r) => String(r.name_en ?? '').toLowerCase().includes(search));
  if (q.get('home_visit') === 'true') rows = rows.filter((r) => r.home_visit_supported === true);
  const price = (r: Row) => (typeof r.price === 'number' && r.price > 0 ? r.price : Infinity);
  if (q.get('lowest_price') === 'true') rows.sort((a, b) => price(a) - price(b));
  if (q.get('highest_rated') === 'true') rows.sort((a, b) => Number(b.rating ?? -1) - Number(a.rating ?? -1));
  if (!q.has('page')) return rows;
  const page = Math.max(1, Math.floor(Number(q.get('page'))) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(q.get('limit'))) || 20));
  return { data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, total_pages: Math.ceil(rows.length / limit) };
}
