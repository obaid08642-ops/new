import { useCallback, useEffect, useState } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';

interface FraudAlert {
  id?: string;
  _id?: string;
  entityId?: string;
  entity_id?: string;
  entityName?: string;
  type?: string;
  flagReason?: string;
  severity?: 'high' | 'medium' | 'low' | string;
  status?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FraudAlertsResponse {
  data?: FraudAlert[];
  total?: number;
}

interface SeverityMetrics {
  total: number;
  high: number;
  medium: number;
  low: number;
}

const SEVERITIES = ['', 'high', 'medium', 'low'] as const;

/**
 * Fraud & risk overview backed exclusively by real backend routes:
 * - GET admin/governance/fraud-alerts?q=&severity=&page=&limit=
 * Read-only by design (the backend exposes no alert-action endpoints);
 * enforcement happens from the operational screens, same as fraud-monitoring.
 */
export function FraudRiskDashboard() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<SeverityMetrics>({ total: 0, high: 0, medium: 0, low: 0 });
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (query.trim()) params.set('q', query.trim());
      if (severity) params.set('severity', severity);
      const res = await fetchWithAdminGuard(`/api/admin/admin/governance/fraud-alerts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as FraudAlertsResponse;
      const rows = Array.isArray(body.data) ? body.data : [];
      setAlerts(rows);
      setTotal(body.total ?? rows.length);
      setMetrics({
        total: body.total ?? rows.length,
        high: rows.filter((a) => a.severity === 'high').length,
        medium: rows.filter((a) => a.severity === 'medium').length,
        low: rows.filter((a) => a.severity === 'low').length,
      });
    } catch {
      setError('تعذر تحميل تنبيهات الاحتيال.');
    } finally {
      setLoading(false);
    }
  }, [query, severity, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 350);
    return () => clearTimeout(t);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  const metric = (label: string, value: number, color = 'text-gray-900') => (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 shadow-sm">
        عرض مراقبة فقط — الإجراءات من الشاشات المختصة
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metric('إجمالي التنبيهات', metrics.total)}
        {metric('خطورة عالية', metrics.high, 'text-red-600')}
        {metric('خطورة متوسطة', metrics.medium, 'text-amber-600')}
        {metric('خطورة منخفضة', metrics.low, 'text-green-600')}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="بحث في التنبيهات"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as (typeof SEVERITIES)[number]);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">كل درجات الخطورة</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">جارٍ تحميل تنبيهات الاحتيال…</p>
      ) : alerts.length === 0 ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-400">
          لا توجد تنبيهات مطابقة — جيد، لا مخاطر مكتشفة
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {alerts.map((alert, idx) => {
            const key = alert.id || alert._id || `alert-${idx}`;
            const sev = alert.severity || 'medium';
            return (
              <div key={key} className="rounded-xl border border-gray-200 border-r-4 border-r-red-500 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-gray-900">{alert.entityName || 'جهة غير محددة'}</h3>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold uppercase tracking-wider ${
                      sev === 'high' ? 'bg-red-100 text-red-700' : sev === 'low' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {sev} Risk
                  </span>
                </div>
                <div className="mt-2 rounded bg-red-50 p-2 text-sm font-medium text-red-800">
                  {alert.flagReason || 'تنبيه احتيال محتمل'}
                </div>
                <div className="mt-3 font-mono text-xs text-gray-400">
                  Entity ID: {alert.entityId || alert.entity_id || '—'} ({alert.type || '—'})
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-sm text-slate-500">تنبيهات: {total} (خادمي)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm font-bold text-slate-700">
            صفحة {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-bold disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}
