import { useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';

/**
 * 23.4 — audit timeline per subject.
 *
 * Contract (backend builds in parallel — code against it exactly):
 *   GET /api/v1/admin/audit/timeline/:entityType/:entityId
 *
 * Reached through the admin BFF 1:1 mapping, so the call site below uses
 * `/api/admin/admin/audit/timeline/...`. No mock data: when the backend route
 * is not deployed yet the page shows an honest error/empty state.
 */

type TimelineTab = 'user' | 'order' | 'booking' | 'provider';

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
  diff?: Record<string, { before?: unknown; after?: unknown }>;
  created_at?: string;
  createdAt?: string;
  at?: string;
};

type TimelineResponse = {
  data?: AuditEvent[];
  items?: AuditEvent[];
  events?: AuditEvent[];
};

function eventList(payload: TimelineResponse | null | undefined): AuditEvent[] {
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

function eventTime(raw: string | undefined): string {
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ar-SA-u-ca-gregory');
}

const TABS: Array<{ key: TimelineTab; label: string; placeholder: string }> = [
  { key: 'user', label: 'مستخدم', placeholder: 'معرّف المستخدم' },
  { key: 'order', label: 'طلب', placeholder: 'رقم الطلب (order id)' },
  { key: 'booking', label: 'حجز', placeholder: 'رقم الحجز (booking id)' },
  { key: 'provider', label: 'مزوّد', placeholder: 'معرّف المزوّد' },
];

const inputClass = 'mt-1 w-full rounded-lg border px-3 py-2 text-sm';

export default function AuditTimelinePage() {
  const [tab, setTab] = useState<TimelineTab>('user');
  const [entityId, setEntityId] = useState('');
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const id = entityId.trim();
    if (!id) {
      setError('أدخل المعرّف أولاً.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = await adminFetch<TimelineResponse>(
        `/api/admin/admin/audit/timeline/${encodeURIComponent(tab)}/${encodeURIComponent(id)}`,
      );
      setRows(eventList(payload));
      setLoaded(true);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'تعذر تحميل الخط الزمني. قد تكون واجهة التدقيق غير متاحة بعد.'));
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  const activeTab = TABS.find((entry) => entry.key === tab) || TABS[0];

  return (
    <>
      <Head><title>الخط الزمني للتدقيق | نبض بلس</title></Head>
      <section dir="rtl" className="space-y-6 p-6 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">الخط الزمني للتدقيق</h1>
          <p className="mt-1 text-sm text-slate-500">
            عرض مرتب زمنياً لكل الأحداث المرتبطة بمستخدم أو طلب / حجز أو مزوّد.
          </p>
        </header>

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          تنبيه الخصوصية: يُخفي الخادم (backend) البيانات الشخصية تلقائياً، والقيم المعروضة هنا هي القيم
          المقنّعة كما وصلت. التفاصيل الكاملة: للمالك فقط (owner only). كل قراءة لسجل التدقيق مسجّلة
          باسم القارئ.
        </p>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="نوع الموضوع">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                role="tab"
                aria-selected={tab === entry.key}
                onClick={() => { setTab(entry.key); setEntityId(''); setRows([]); setLoaded(false); setError(''); }}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === entry.key ? 'bg-teal-700 text-white' : 'border text-slate-600'}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => { event.preventDefault(); void load(); }}
          >
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={activeTab.placeholder}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
            <button type="submit" disabled={loading} className="rounded-lg bg-teal-700 px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
              {loading ? 'جارٍ التحميل…' : 'عرض الخط الزمني'}
            </button>
          </form>
        </div>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        {loading ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل الخط الزمني…</p>
        ) : !loaded ? (
          <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">اختر النوع وأدخل المعرّف لعرض الخط الزمني.</p>
        ) : rows.length ? (
          <ol className="relative space-y-4 border-r-2 border-teal-100 pr-6">
            {rows.map((row, index) => (
              <li key={row.id || row._id || index} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold text-slate-900">{row.action || 'حدث تدقيق'}</h2>
                  <time className="text-xs text-slate-500">{eventTime(row.created_at || row.createdAt || row.at)}</time>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  المنفّذ: {actorLabel(row.actor)}
                  {row.ip || row.device_id ? (
                    <span className="text-xs text-slate-400"> · {[row.ip, row.device_id].filter(Boolean).join(' · ')}</span>
                  ) : null}
                </p>
                {row.reason ? <p className="mt-1 text-sm text-slate-600">السبب: {row.reason}</p> : null}
                {row.diff && Object.keys(row.diff).length > 0 ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-bold text-teal-800">التغييرات (قبل / بعد)</summary>
                    <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3" dir="ltr" style={{ textAlign: 'left' }}>
                      {Object.entries(row.diff).map(([field, change]) => (
                        <li key={field}>
                          <strong>{field}</strong>: {JSON.stringify(change?.before ?? null)} → {JSON.stringify(change?.after ?? null)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">لا توجد أحداث لهذا الموضوع.</p>
        )}
      </section>
    </>
  );
}
