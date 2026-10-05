// 7790744 / X5-B2: report rows are aggregates (backend admin-reports.controller.ts:
// bucket = day 'YYYY-MM-DD' | status | service, plus `kind` on bookings). A row
// links to the orders console filtered to exactly that slice; there each record
// opens /admin/orders/[kind]/[id] with its state history. Tabs whose records have
// no filterable console get no row link instead of one generic link per row.

export type ReportRow = { bucket?: unknown; kind?: unknown; [field: string]: unknown };
export type OrdersConsoleFilters = { kind: string; status: string; q: string; from: string; to: string; sort: string };

// Kinds the orders console serves (backend orders-console.service.ts ORDER_KINDS).
const CONSOLE_KINDS = ['pharmacy', 'lab', 'radiology', 'nursing', 'consultation'] as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isConsoleKind(value: unknown): value is (typeof CONSOLE_KINDS)[number] {
  return typeof value === 'string' && (CONSOLE_KINDS as readonly string[]).includes(value);
}

function slice(kind: string, groupBy: string, bucket: unknown): string | null {
  const params = new URLSearchParams({ kind });
  if (groupBy === 'day') {
    if (typeof bucket !== 'string' || !DAY.test(bucket) || Number.isNaN(Date.parse(bucket))) return null;
    // The console filters createdAt >= from and <= to (midnight), so `to` is the next day.
    params.set('from', bucket);
    params.set('to', nextDay(bucket));
  } else if (groupBy === 'status') {
    if (typeof bucket !== 'string' || !bucket.trim()) return null;
    params.set('status', bucket);
  } else if (groupBy !== 'service') {
    return null;
  }
  return `/admin/orders?${params.toString()}`;
}

export function reportRowHref(tab: string, groupBy: string, row: ReportRow): string | null {
  if (tab === 'orders') return slice('pharmacy', groupBy, row.bucket);
  if (tab === 'bookings') return isConsoleKind(row.kind) ? slice(row.kind, groupBy, row.bucket) : null;
  return null;
}

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** Initial orders-console filters from the URL, so a report row link opens that slice. */
export function ordersFiltersFromQuery(query: Query): OrdersConsoleFilters {
  const kind = first(query.kind);
  const from = first(query.from);
  const to = first(query.to);
  return {
    kind: isConsoleKind(kind) ? kind : '',
    status: first(query.status).slice(0, 64),
    q: '',
    from: DAY.test(from) ? from : '',
    to: DAY.test(to) ? to : '',
    sort: 'newest',
  };
}
