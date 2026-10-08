import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { DataTable, type LooseRow } from '@/components/DataTable';

/**
 * M5: platform commissions + ledger summary.
 * GET /admin/finance/ledger/summary (M3 finance core) · GET /admin/finance/commissions (legacy ledger)
 * Rates (BR): استشارة 15% · صيدلية 10% · معمل/أشعة/عيادة 12% · منزلي/تمريض/طبيعي 18%
 */
const SERVICE_AR: Record<string, string> = {
  consultation: 'استشارات', pharmacy: 'صيدلية', lab: 'مختبر', radiology: 'أشعة',
  clinic: 'عيادات', home_care: 'رعاية منزلية', nursing: 'تمريض', physiotherapy: 'علاج طبيعي',
};
const RATE_AR: Record<string, string> = {
  consultation: '15%', pharmacy: '10%', lab: '12%', radiology: '12%', clinic: '12%',
  home_care: '18%', nursing: '18%', physiotherapy: '18%',
};

export default function CommissionsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [legacy, setLegacy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // P6.x-4: commission & copay rule editor (per service / provider / category / campaign).
  const [history, setHistory] = useState<any[]>([]);
  const [rule, setRule] = useState({ scope: 'provider', scope_id: '', service_type: '', percent: '', effective_from: '', effective_to: '' });
  const [ruleMsg, setRuleMsg] = useState('');

  const loadHistory = async () => {
    try {
      const rows = await apiFetch<any[]>('/api/admin/admin/finance-engine/commission-rules/history');
      setHistory(Array.isArray(rows) ? rows : []);
    } catch { /* history optional */ }
  };

  const saveRule = async () => {
    const percent = Number(rule.percent);
    if (!rule.scope || !(percent >= 0 && percent <= 100)) { setRuleMsg('النسبة 0-100 والنطاق مطلوبان'); return; }
    if (rule.scope !== 'service' && !rule.scope_id.trim()) { setRuleMsg('scope_id مطلوب لغير نطاق الخدمة'); return; }
    try {
      await apiFetch('/api/admin/admin/finance-engine/commission-rules', {
        method: 'POST',
        body: JSON.stringify({
          scope: rule.scope, scope_id: rule.scope_id.trim() || undefined,
          service_type: rule.service_type.trim() || undefined, percent,
          effective_from: rule.effective_from || undefined, effective_to: rule.effective_to || undefined,
        }),
      });
      setRuleMsg('تم حفظ القاعدة');
      setRule({ scope: 'provider', scope_id: '', service_type: '', percent: '', effective_from: '', effective_to: '' });
      await loadHistory();
    } catch (e: any) { setRuleMsg(e?.message || 'فشل الحفظ'); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        apiFetch('/api/admin/admin/finance/ledger/summary').catch(() => null),
        apiFetch('/api/admin/admin/finance/commissions').catch(() => ({ data: [] })),
      ]);
      setSummary(s);
      setLegacy(c?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات العمولات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { void loadHistory(); }, []);

  const totalGross = (summary?.by_service || []).reduce((s: number, r: any) => s + (r.gross || 0), 0);

  return (
    <>
      <Head><title>العمولات والأستاذ | نبض</title></Head>
        <div className="p-8 space-y-6">
          <div className="flex justify-end">
            <button onClick={load} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">تحديث </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">جاري التحميل…</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700 font-bold">{error}</div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gradient-to-l from-teal-600 to-teal-500 rounded-2xl p-6 text-white">
                  <div className="text-sm opacity-80">إجمالي عمولة المنصة (مستحقة)</div>
                  <div className="text-3xl font-black mt-2">{summary?.total_commission ?? 0} ر.س</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="text-sm text-slate-500">إجمالي قيمة الخدمات (Gross)</div>
                  <div className="text-3xl font-black mt-2 text-slate-900">{Math.round(totalGross * 100) / 100} ر.س</div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="text-sm text-slate-500">متوسط العمولة الفعلي</div>
                  <div className="text-3xl font-black mt-2 text-indigo-600">
                    {totalGross > 0 ? `${Math.round(((summary?.total_commission || 0) / totalGross) * 1000) / 10}%` : '—'}
                  </div>
                </div>
              </div>

              {/* By service type */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800">العمولات حسب نوع الخدمة</h2>
                  <span className="text-xs text-slate-400">النسب المعتمدة: استشارة 15% · صيدلية 10% · معمل/أشعة/عيادة 12% · منزلي 18%</span>
                </div>
                {(summary?.by_service || []).length === 0 ? (
                  <div className="p-12 text-center text-slate-500">لا قيود مستحقة بعد — تُسجل تلقائيًا عند اكتمال المدفوعات.</div>
                ) : (
                  <DataTable
                    bare
                    dense
                    rows={summary.by_service as LooseRow[]}
                    getRowKey={(r: LooseRow) => String(r._id)}
                    rowClassName={() => 'hover:bg-slate-50'}
                    columns={[
                      { key: 'svc', header: 'نوع الخدمة', className: 'font-medium', render: (r: LooseRow) => SERVICE_AR[r._id] || r._id || 'أخرى' },
                      { key: 'count', header: 'عدد العمليات', render: (r: LooseRow) => r.count },
                      { key: 'gross', header: 'إجمالي القيمة', render: (r: LooseRow) => `${Math.round(r.gross * 100) / 100} ر.س` },
                      { key: 'rate', header: 'النسبة', render: (r: LooseRow) => <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{RATE_AR[r._id] || '—'}</span> },
                      { key: 'comm', header: 'عمولة المنصة', className: 'font-bold text-emerald-600', render: (r: LooseRow) => `${Math.round(r.commission * 100) / 100} ر.س` },
                    ]}
                  />
                )}
              </div>

              {/* Legacy commission ledger (raw) */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <h2 className="font-bold text-slate-800">سجل العمولات التفصيلي ({legacy.length})</h2>
                </div>
                {legacy.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">السجل التفصيلي فارغ.</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <DataTable
                      bare
                      dense
                      className="text-xs"
                      rows={legacy.map((c: LooseRow, i: number) => ({ c, i })) as { c: LooseRow; i: number }[]}
                      getRowKey={({ c, i }) => String(c._id || c.id || i)}
                      rowClassName={() => 'hover:bg-slate-50'}
                      columns={[
                        { key: 'id', header: 'المعرف', className: 'font-mono', render: ({ c }) => String(c._id || c.id || '').slice(0, 10) },
                        { key: 'provider', header: 'المزود', className: 'font-mono', render: ({ c }) => String(c.providerId || c.provider_id || '').slice(0, 10) },
                        { key: 'amount', header: 'المبلغ', render: ({ c }) => c.amount ?? c.gross_amount ?? '—' },
                        { key: 'comm', header: 'العمولة', className: 'text-emerald-600 font-bold', render: ({ c }) => c.commission ?? c.commission_amount ?? '—' },
                        { key: 'status', header: 'الحالة', render: ({ c }) => c.status || c.state || '—' },
                      ]}
                    />
                  </div>
                )}
              </div>
          {/* P6.x-4: per-service/provider/category/campaign commission rules */}
          <div className="bg-white rounded-2xl border p-6 mt-6">
            <h2 className="text-lg font-bold mb-1">قواعد العمولات (تتجاوز الافتراضي)</h2>
            <p className="text-xs text-gray-500 mb-4">الأولوية: حملة ← مزود ← فئة ← خدمة ← الإعدادات ← 10%. القواعد المنتهية لا تُطبق.</p>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-sm">النطاق
                <select value={rule.scope} onChange={(e) => setRule({ ...rule, scope: e.target.value })} className="mt-1 w-full border rounded p-2">
                  <option value="provider">مزود</option><option value="service">خدمة</option>
                  <option value="category">فئة</option><option value="campaign">حملة</option>
                </select>
              </label>
              <label className="text-sm">معرّف النطاق (provider id…)
                <input value={rule.scope_id} onChange={(e) => setRule({ ...rule, scope_id: e.target.value })} dir="ltr" className="mt-1 w-full border rounded p-2" placeholder="account/user id" />
              </label>
              <label className="text-sm">نوع الخدمة
                <input value={rule.service_type} onChange={(e) => setRule({ ...rule, service_type: e.target.value })} dir="ltr" className="mt-1 w-full border rounded p-2" placeholder="pharmacy/lab/…" />
              </label>
              <label className="text-sm">النسبة %
                <input type="number" min={0} max={100} step={0.1} value={rule.percent} onChange={(e) => setRule({ ...rule, percent: e.target.value })} dir="ltr" className="mt-1 w-full border rounded p-2" />
              </label>
              <label className="text-sm">سارية من
                <input type="date" value={rule.effective_from} onChange={(e) => setRule({ ...rule, effective_from: e.target.value })} className="mt-1 w-full border rounded p-2" />
              </label>
              <label className="text-sm">سارية إلى
                <input type="date" value={rule.effective_to} onChange={(e) => setRule({ ...rule, effective_to: e.target.value })} className="mt-1 w-full border rounded p-2" />
              </label>
            </div>
            <button onClick={saveRule} className="mt-4 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold">حفظ القاعدة</button>
            {ruleMsg && <p className="mt-2 text-sm font-bold">{ruleMsg}</p>}
            {history.length > 0 && (
              <DataTable
                bare
                dense
                className="mt-4"
                rows={history.slice(0, 20).map((h: LooseRow, i: number) => ({ h, i })) as { h: LooseRow; i: number }[]}
                getRowKey={({ i }) => String(i)}
                columns={[
                  { key: 'scope', header: 'النطاق', render: ({ h }) => h.scope },
                  { key: 'id', header: 'المعرّف', className: 'font-mono text-xs', render: ({ h }) => <span dir="ltr">{h.scope_id || h.service_type || '—'}</span> },
                  { key: 'pct', header: 'النسبة', render: ({ h }) => `${h.percent ?? h.commission}%` },
                  { key: 'eff', header: 'السريان', className: 'text-xs', render: ({ h }) => <>{h.effective_from ? String(h.effective_from).slice(0, 10) : '…'} → {h.effective_to ? String(h.effective_to).slice(0, 10) : '…'}</> },
                ]}
              />
            )}
          </div>
            </>
          )}
        </div>
    </>
  );
}
