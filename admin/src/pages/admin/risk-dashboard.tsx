import React, { useCallback, useEffect, useState } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';
import { dateLocale } from '../../utils/dates';
import { DataTable } from '@/components/DataTable';

/**
 * 22.11 — the risk dashboard: who needs a look, why, and the rules behind the score. Read-only except "re-score",
 * which recomputes one person from the data as it is now. Nothing here blocks anyone: a score only puts a person on this list.
 */

type Signal = { type: string; weight: number; evidence: Record<string, unknown> };
type RiskRow = { user_id: string; score: number; level: 'low' | 'medium' | 'high'; signals: Signal[]; computed_at: string };
type Summary = {
  scored: number; high: number; medium: number; new_flagged_24h: number; open_alerts: number;
  by_signal: Array<{ signal: string; users: number }>;
};

const SIGNAL_LABEL: Record<string, string> = {
  account_farm: 'مزرعة حسابات',
  device_sharing: 'جهاز مشترك بين حسابات',
  fake_orders: 'طلبات وهمية',
  cod_abuse: 'إساءة الدفع عند الاستلام',
  card_testing: 'تجربة بطاقات',
  promo_abuse: 'إساءة العروض والكوبونات',
  refund_abuse: 'إساءة الاسترداد',
  payment_velocity: 'محاولات دفع متكررة',
  coupon_guessing: 'تخمين الكوبونات',
  duplicate_payment: 'دفع مكرر',
};

const LEVEL_STYLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};
const LEVEL_LABEL: Record<string, string> = { high: 'مرتفع', medium: 'متوسط', low: 'منخفض' };

export default function RiskDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState('');
  const [signal, setSignal] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (level) params.set('level', level);
      if (signal) params.set('signal', signal);
      const [s, u] = await Promise.all([
        fetchWithAdminGuard('/api/admin/admin/risk/summary'),
        fetchWithAdminGuard(`/api/admin/admin/risk/users?${params}`),
      ]);
      if (!s.ok || !u.ok) throw new Error('risk_load_failed');
      setSummary(await s.json());
      const list = await u.json();
      setRows(list.users || []);
      setTotal(list.total || 0);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [page, level, signal]);

  useEffect(() => { void load(); }, [load]);

  const rescore = async (id: string) => {
    setBusy(id);
    try {
      const r = await fetchWithAdminGuard(`/api/admin/admin/risk/users/${encodeURIComponent(id)}/rescore`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (r.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / 25));
  const card = (label: string, value: number | string, tone = 'text-gray-900') => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${tone}`}>{value}</div>
    </div>
  );

  return (
    <div className="p-8 h-full flex flex-col gap-6" dir="rtl">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">لوحة المخاطر</h1>
        <p className="text-gray-500 mt-1">من يحتاج إلى مراجعة ولماذا. النتيجة لا تحظر أحدًا؛ تضع الشخص في هذه القائمة فقط.</p>
      </div>

      {failed ? <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">تعذّر تحميل لوحة المخاطر. <button type="button" className="underline" onClick={() => void load()}>إعادة المحاولة</button></div> : null}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {card('خطر مرتفع', summary?.high ?? '—', 'text-red-600')}
        {card('خطر متوسط', summary?.medium ?? '—', 'text-amber-600')}
        {card('جديد خلال 24 ساعة', summary?.new_flagged_24h ?? '—')}
        {card('تنبيهات مفتوحة', summary?.open_alerts ?? '—')}
        {card('حسابات مقيَّمة', summary?.scored ?? '—')}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="المستوى" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">متوسط ومرتفع</option>
          <option value="high">مرتفع فقط</option>
        </select>
        <select aria-label="الإشارة" value={signal} onChange={(e) => { setSignal(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">كل الإشارات</option>
          {(summary?.by_signal || []).map((b) => <option key={b.signal} value={b.signal}>{(SIGNAL_LABEL[b.signal] || b.signal) + ` (${b.users})`}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-auto shadow-sm">
        <DataTable
          bare
          loading={loading}
          emptyText="لا يوجد حسابات تحتاج إلى مراجعة الآن."
          rows={rows}
          getRowKey={(r) => r.user_id}
          columns={[
            { key: 'user', header: 'الحساب', className: 'font-mono text-xs', render: (r) => r.user_id },
            { key: 'score', header: 'الدرجة', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-100 rounded"><div className={`h-2 rounded ${r.level === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${r.score}%` }} /></div>
                <span className="font-bold">{r.score}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${LEVEL_STYLE[r.level]}`}>{LEVEL_LABEL[r.level]}</span>
              </div>
            ) },
            { key: 'signals', header: 'الأسباب', render: (r) => (
              <ul className="space-y-1">
                {r.signals.map((s) => (
                  <li key={s.type} className="text-sm"><span className="font-medium">{SIGNAL_LABEL[s.type] || s.type}</span> <span className="text-gray-500">(+{s.weight})</span>
                    <span className="text-xs text-gray-400 ms-2">{Object.entries(s.evidence).filter(([k, v]) => typeof v !== 'object' && k !== 'alert_id').map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            ) },
            { key: 'at', header: 'آخر حساب', className: 'text-xs text-gray-500', render: (r) => new Date(r.computed_at).toLocaleString(dateLocale()) },
            { key: 'act', header: '', actions: true, render: (r) => <button type="button" disabled={busy === r.user_id} onClick={() => void rescore(r.user_id)} className="text-sm underline disabled:opacity-50">إعادة الحساب</button> },
          ]}
        />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">السابق</button>
        <span>{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">التالي</button>
      </div>
    </div>
  );
}
