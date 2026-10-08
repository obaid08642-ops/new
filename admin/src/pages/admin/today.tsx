import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';

/**
 * Phone-first "today" screen: the same live numbers the command centre draws, in one column of big tiles, with the
 * urgent alerts and the problem orders (stuck orders, failed payments) first. No new endpoints:
 * GET /admin/command-center-v2, /admin/ops/alerts, /admin/ops/overview, /admin/ops/domain-metrics.
 */

type Tiles = {
  orders_active: number; labs_active: number; radiology_active: number; nursing_active: number; appointments_today: number;
  sos_open: number; tickets_open: number; revenue_24h_sar: number; payments_24h: number; sla_breach_total: number;
};
type Snapshot = { ts: string; tiles: Tiles };
type OpsOverview = { today?: { total_requests?: number; success_rate?: number | null; server_errors?: number } };
type DomainMetrics = { pharmacy?: { fill_rate_pct?: number | null }; consultations?: { no_show?: number; no_show_rate_pct?: number } };
type OpsAlerts = {
  stuck_minutes_threshold?: number;
  stuck_orders?: Array<{ kind?: string; id?: string; state?: string; since?: string }>;
  stuck_count?: number;
  failed_payments?: Array<{ id?: string; booking_kind?: string; booking_id?: string; amount?: number; status?: string }>;
  failed_count?: number;
};

const TILES: Array<{ key: keyof Tiles; label: string; href?: string }> = [
  { key: 'orders_active', label: 'طلبات نشطة', href: '/admin/orders' },
  { key: 'appointments_today', label: 'مواعيد اليوم', href: '/admin/orders?kind=consultation' },
  { key: 'labs_active', label: 'تحاليل نشطة', href: '/admin/orders?kind=lab' },
  { key: 'radiology_active', label: 'أشعة نشطة', href: '/admin/orders?kind=radiology' },
  { key: 'nursing_active', label: 'تمريض نشط', href: '/admin/orders?kind=nursing' },
  { key: 'tickets_open', label: 'تذاكر دعم مفتوحة', href: '/admin/support-tickets' },
  { key: 'payments_24h', label: 'مدفوعات آخر 24 ساعة', href: '/admin/finance-suite' },
  { key: 'revenue_24h_sar', label: 'إيراد آخر 24 ساعة (ر.س)', href: '/admin/finance-suite' },
];

const num = (n: number | null | undefined) => (typeof n === 'number' ? n.toLocaleString('ar-SA-u-ca-gregory') : '—');

export default function TodayPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [alerts, setAlerts] = useState<OpsAlerts | null>(null);
  const [ops, setOps] = useState<OpsOverview | null>(null);
  const [metrics, setMetrics] = useState<DomainMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pull = useCallback(() => Promise.all([
    adminFetch<Snapshot>('/api/admin/admin/command-center-v2'),
    adminFetch<OpsAlerts>('/api/admin/admin/ops/alerts').catch(() => null),
    adminFetch<OpsOverview>('/api/admin/admin/ops/overview').catch(() => null),
    adminFetch<DomainMetrics>('/api/admin/admin/ops/domain-metrics').catch(() => null),
  ]), []);

  const apply = useCallback(([snap, al, ov, dm]: Awaited<ReturnType<typeof pull>>) => {
    setSnapshot(snap);
    setAlerts(al);
    setOps(ov);
    setMetrics(dm);
    setError('');
    setLoading(false);
  }, []);
  const fail = useCallback((cause: unknown) => {
    setError(apiErrorMessage(cause, 'تعذر تحميل أرقام اليوم.'));
    setLoading(false);
  }, []);
  const load = useCallback(() => { setLoading(true); pull().then(apply, fail); }, [pull, apply, fail]);

  useEffect(() => {
    pull().then(apply, fail);
    const timer = window.setInterval(() => { pull().then(apply, fail); }, 60000);
    return () => window.clearInterval(timer);
  }, [pull, apply, fail]);

  const tiles = snapshot?.tiles;
  const stuck = alerts?.stuck_orders ?? [];
  const failed = alerts?.failed_payments ?? [];
  const urgent: Array<{ key: string; text: string; href: string }> = [];
  if (tiles && tiles.sla_breach_total > 0) urgent.push({ key: 'sla', text: `${num(tiles.sla_breach_total)} طلب تجاوز مهلة الخدمة (SLA)`, href: '/admin/orders' });
  if (alerts?.stuck_count) urgent.push({ key: 'stuck', text: `${num(alerts.stuck_count)} طلب عالق أكثر من ${alerts.stuck_minutes_threshold ?? 30} دقيقة`, href: '/admin/orders' });
  if (alerts?.failed_count) urgent.push({ key: 'failed', text: `${num(alerts.failed_count)} مدفوعات فاشلة`, href: '/admin/finance-suite' });

  return (
    <>
      <Head><title>اليوم | نبض</title></Head>
      <section dir="rtl" className="space-y-5 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">اليوم</h1>
            <p className="mt-1 text-xs text-slate-500">آخر تحديث: {snapshot?.ts ? new Date(snapshot.ts).toLocaleString('ar-SA-u-ca-gregory') : '—'} · يتجدد كل دقيقة</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/approvals" className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">بانتظار موافقتي</Link>
            <button onClick={load} disabled={loading} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">تحديث</button>
          </div>
        </header>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        <article className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm md:p-6" aria-labelledby="today-urgent">
          <h2 id="today-urgent" className="text-lg font-bold">تنبيهات عاجلة</h2>
          {urgent.length ? (
            <ul className="mt-3 space-y-2">
              {urgent.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
                    <span>{item.text}</span><span aria-hidden="true">‹</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">{loading ? 'جارٍ التحميل…' : 'لا توجد تنبيهات عاجلة الآن.'}</p>}
        </article>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((tile) => {
            const body = (
              <>
                <p className="text-xs text-slate-500">{tile.label}</p>
                <p className="mt-1 text-2xl font-bold">{loading && !tiles ? '…' : num(tiles?.[tile.key])}</p>
              </>
            );
            return tile.href
              ? <Link key={tile.key} href={tile.href} className="rounded-2xl border bg-white p-4 shadow-sm">{body}</Link>
              : <div key={tile.key} className="rounded-2xl border bg-white p-4 shadow-sm">{body}</div>;
          })}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">طلبات الخادم اليوم</p>
            <p className="mt-1 text-2xl font-bold">{num(ops?.today?.total_requests)}</p>
            <p className="text-xs text-slate-500">نجاح {ops?.today?.success_rate != null ? `${ops.today.success_rate}%` : '—'}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">تلبية الصيدلية (30 يوماً)</p>
            <p className="mt-1 text-2xl font-bold">{metrics?.pharmacy?.fill_rate_pct != null ? `${metrics.pharmacy.fill_rate_pct}%` : '—'}</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">عدم حضور الاستشارات</p>
            <p className="mt-1 text-2xl font-bold">{num(metrics?.consultations?.no_show)}</p>
            <p className="text-xs text-slate-500">المعدل {metrics?.consultations?.no_show_rate_pct ?? 0}%</p>
          </div>
        </div>

        <article className="rounded-2xl border bg-white p-4 shadow-sm md:p-6" aria-labelledby="today-problems">
          <h2 id="today-problems" className="text-lg font-bold">طلبات بها مشكلة</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-black">عالقة ({num(alerts?.stuck_count ?? 0)})</h3>
              {stuck.slice(0, 20).map((s) => (
                <div key={`${s.kind}:${s.id}`} className="flex items-center justify-between gap-3 border-b py-2 text-sm">
                  <span className="min-w-0 truncate">{s.kind} · {String(s.id).slice(0, 8)} · {s.state}</span>
                  {s.kind && s.id
                    ? <Link href={`/admin/orders/${encodeURIComponent(s.kind)}/${encodeURIComponent(s.id)}`} className="inline-flex min-h-11 shrink-0 items-center rounded border px-3 text-xs font-bold text-teal-700">فتح</Link>
                    : null}
                </div>
              ))}
              {stuck.length === 0 ? <p className="text-sm text-slate-400">لا طلبات عالقة.</p> : null}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black">مدفوعات فاشلة ({num(alerts?.failed_count ?? 0)})</h3>
              {failed.slice(0, 20).map((f, index) => (
                <div key={f.id ?? index} className="flex items-center justify-between gap-3 border-b py-2 text-sm">
                  <span className="min-w-0 truncate">{f.booking_kind} · {Number(f.amount || 0)} ر.س · {f.status}</span>
                  <Link href="/admin/finance-suite" className="inline-flex min-h-11 shrink-0 items-center rounded border px-3 text-xs font-bold text-teal-700">فتح</Link>
                </div>
              ))}
              {failed.length === 0 ? <p className="text-sm text-slate-400">لا مدفوعات فاشلة.</p> : null}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
