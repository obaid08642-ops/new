import { useState } from 'react';
import Head from 'next/head';
import { adminFetch, adminRequest, apiErrorMessage, toQuery } from '@/lib/admin-client';

/**
 * 23.4 — unified audit-trail search.
 *
 * Contract (backend builds in parallel — code against it exactly):
 *   GET /api/v1/admin/audit/search  (query: actor, entity, from, to, q)
 *   GET /api/v1/admin/audit/export?format=csv  (+ the same search params)
 *
 * Reached through the admin BFF 1:1 mapping, so the call sites below use
 * `/api/admin/admin/audit/...`. No mock data: when the backend route is not
 * deployed yet the page shows an honest error/empty state.
 */

type AuditEvent = {
  id?: string;
  _id?: string;
  action?: string;
  actor?: { id?: string; full_name?: string; email?: string; role?: string } | string;
  entity_type?: string;
  entity_id?: string;
  entity?: string;
  ip?: string;
  device_id?: string;
  reason?: string;
  created_at?: string;
  createdAt?: string;
  at?: string;
};

type SearchResponse = {
  data?: AuditEvent[];
  items?: AuditEvent[];
  events?: AuditEvent[];
  total?: number;
};

function eventList(payload: SearchResponse | null | undefined): AuditEvent[] {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.events)) return payload.events;
  return [];
}

function actorLabel(actor: AuditEvent['actor']): string {
  if (!actor) return '—';
  if (typeof actor === 'string') return actor;
  return actor.full_name || actor.email || actor.id || '—';
}

function eventTime(row: AuditEvent): string {
  const raw = row.created_at || row.createdAt || row.at;
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-SA-u-ca-gregory');
}

const inputClass = 'mt-1 w-full rounded-lg border px-3 py-2 text-sm';

export default function AuditSearchPage() {
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  function searchParams() {
    return { actor, entity, from, to, q };
  }

  async function runSearch() {
    setLoading(true);
    setError('');
    try {
      const payload = await adminFetch<SearchResponse>(
        `/api/admin/admin/audit/search${toQuery(searchParams())}`,
      );
      setRows(eventList(payload));
      setTotal(typeof payload?.total === 'number' ? payload.total : eventList(payload).length);
      setSearched(true);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر البحث في سجل التدقيق. قد تكون واجهة التدقيق غير متاحة بعد.'));
      setRows([]);
      setTotal(0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  /** CSV-only: the repo has no PDF generation path, so no PDF option is offered. */
  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      const response = await adminRequest(
        `/api/admin/admin/audit/export${toQuery({ format: 'csv', ...searchParams() })}`,
      );
      if (!response.ok) throw new Error(`export_failed_${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تصدير سجل التدقيق. قد تكون واجهة التصدير غير متاحة بعد.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Head><title>بحث سجل التدقيق | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">بحث سجل التدقيق</h1>
            <p className="mt-1 text-sm text-slate-500">
              بحث في مسار التدقيق الموحّد حسب المستخدم أو الطلب أو التاريخ — للطلبات القانونية والمراجعة.
            </p>
          </div>
          <button
            onClick={() => void exportCsv()}
            disabled={exporting || !searched || rows.length === 0}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {exporting ? 'جارٍ التصدير…' : 'تصدير CSV (نتائج البحث الحالي)'}
          </button>
        </header>

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          تنبيه الخصوصية: يُخفي الخادم (backend) البيانات الشخصية تلقائياً، والقيم المعروضة هنا هي القيم
          المقنّعة كما وصلت. التفاصيل الكاملة: للمالك فقط (owner only). كل قراءة لسجل التدقيق مسجّلة
          باسم القارئ. التصدير متاح بصيغة CSV فقط — لا يوجد مسار PDF في المستودع حالياً.
        </p>

        <form
          onSubmit={(event) => { event.preventDefault(); void runSearch(); }}
          className="grid gap-3 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3"
        >
          <label className="text-sm">المستخدم / المنفّذ (actor)
            <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="معرّف أو اسم المستخدم" className={inputClass} />
          </label>
          <label className="text-sm">الكيان / رقم الطلب (entity)
            <input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="order id أو معرّف الكيان" className={inputClass} dir="ltr" />
          </label>
          <label className="text-sm">بحث حر (q)
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="هاتف، بريد، IP، جهاز…" className={inputClass} />
          </label>
          <label className="text-sm">من تاريخ (from)
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="text-sm">إلى تاريخ (to)
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {loading ? 'جارٍ البحث…' : 'بحث'}
            </button>
          </div>
          <p className="text-xs text-slate-500 md:col-span-3">
            يغطي البحث الحر (q): الهاتف، البريد الإلكتروني، رقم الطلب، عنوان IP، ومعرّف الجهاز.
          </p>
        </form>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr><th className="p-4">الوقت</th><th className="p-4">المنفّذ</th><th className="p-4">الإجراء</th><th className="p-4">الكيان</th><th className="p-4">IP / الجهاز</th><th className="p-4">السبب</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">جارٍ البحث…</td></tr>
              ) : !searched ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">أدخل معايير البحث ثم اضغط «بحث».</td></tr>
              ) : rows.length ? (
                rows.map((row, index) => (
                  <tr key={row.id || row._id || index} className="border-t">
                    <td className="p-4 text-xs text-slate-500">{eventTime(row)}</td>
                    <td className="p-4">{actorLabel(row.actor)}</td>
                    <td className="p-4 font-medium">{row.action || '—'}</td>
                    <td className="p-4" dir="ltr" style={{ textAlign: 'right' }}>{[row.entity_type || row.entity, row.entity_id].filter(Boolean).join(' ') || '—'}</td>
                    <td className="p-4 text-xs text-slate-500" dir="ltr" style={{ textAlign: 'right' }}>{[row.ip, row.device_id].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="p-4 text-slate-600">{row.reason || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {searched && !loading ? <p className="text-sm text-slate-500">إجمالي النتائج: {total}</p> : null}
      </section>
    </>
  );
}
