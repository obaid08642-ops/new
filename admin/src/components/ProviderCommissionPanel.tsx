import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { useCan } from '@/components/AdminGuard';

/**
 * One provider's commission: what is charged now (and why), the provider's own commission, and a promotion (X%, 0 allowed, between
 * two dates or for the first N completed orders; it ends by itself). Every figure is the server's (CommissionResolver); a change needs
 * finance.config.edit and a reason, and goes to the audit trail. GET/PUT/DELETE /admin/provider-commissions/:providerId[/promo].
 */
type View = {
  provider_id: string; type: string | null; service_type: string;
  override: { cash: number | null; insurance: number | null };
  effective: { cash: { percent: number; source: string }; insurance: { percent: number; source: string } };
  promos: Array<{ id: string; percent: number; starts_at: string | null; ends_at: string | null; max_orders: number | null; used_orders: number; orders_left: number | null; state: string; note: string | null }>;
};

const SOURCE_AR: Record<string, string> = {
  provider_promo: 'عرض ترويجي', provider_override: 'قاعدة المزود', provider_profile: 'عمولة المزود', campaign_override: 'حملة',
  category_override: 'فئة', service_default: 'قاعدة الخدمة', finance_config: 'الإعداد الافتراضي للخدمة', system_default: 'الافتراضي العام',
};
const STATE_AR: Record<string, string> = { active: 'ساري', scheduled: 'مجدول', ended: 'انتهى', exhausted: 'اكتملت الطلبات', cancelled: 'ملغى' };
const day = (v: string | null) => (v ? String(v).slice(0, 10) : '…');

export function ProviderCommissionPanel() {
  const can = useCan('finance.config.edit');
  const [id, setId] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState('');
  const [own, setOwn] = useState({ cash: '', insurance: '' });
  const [promo, setPromo] = useState({ percent: '', starts_at: '', ends_at: '', max_orders: '', note: '' });

  const pid = encodeURIComponent(id.trim());
  const call = async (url: string, method: string, body?: unknown) => {
    setMsg('');
    try {
      const v = await apiFetch<View>(url, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setView(v);
      return true;
    } catch (e: any) { setMsg(e?.message || 'تعذر تنفيذ الطلب'); return false; }
  };
  const needReason = () => { if (reason.trim().length < 10) { setMsg('سبب التغيير مطلوب (10 أحرف على الأقل)'); return false; } return true; };
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const saveOwn = async () => {
    if (!needReason()) return;
    const cash = num(own.cash); const insurance = num(own.insurance);
    if (cash === undefined && insurance === undefined) { setMsg('أدخل نسبة الكاش أو التأمين'); return; }
    if (await call(`/api/admin/admin/provider-commissions/${pid}`, 'PUT', { cash, insurance, reason: reason.trim() })) setMsg('تم حفظ عمولة المزود');
  };
  const savePromo = async () => {
    if (!needReason()) return;
    const percent = num(promo.percent);
    if (percent === undefined || !(percent >= 0 && percent <= 100)) { setMsg('نسبة العرض بين 0 و100'); return; }
    if (!promo.ends_at && !promo.max_orders) { setMsg('حدّد تاريخ الانتهاء أو عدد الطلبات'); return; }
    const ok = await call(`/api/admin/admin/provider-commissions/${pid}/promo`, 'PUT', {
      percent, starts_at: promo.starts_at || undefined, ends_at: promo.ends_at || undefined,
      max_orders: promo.max_orders ? Number(promo.max_orders) : undefined, note: promo.note || undefined, reason: reason.trim(),
    });
    if (ok) setMsg('تم حفظ العرض');
  };

  return (
    <div className="bg-white rounded-2xl border p-6 mt-6" data-testid="provider-commission-panel">
      <h2 className="text-lg font-bold mb-1">عمولة مزود محدد وعروض الانطلاق</h2>
      <p className="text-xs text-gray-500 mb-4">الأولوية: حملة ← عرض المزود ← عمولة المزود ← فئة ← خدمة ← الإعدادات ← الافتراضي العام. العرض ينتهي تلقائياً ثم تعود العمولة المعتادة.</p>
      <div className="flex gap-2">
        <input value={id} onChange={(e) => setId(e.target.value)} dir="ltr" className="flex-1 border rounded p-2 text-sm" placeholder="account id" />
        <button onClick={() => id.trim() && call(`/api/admin/admin/provider-commissions/${pid}`, 'GET')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold">عرض</button>
      </div>
      {msg && <p className="mt-2 text-sm font-bold">{msg}</p>}
      {view && (
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="border rounded-xl p-3">المحتسب الآن (كاش): <b>{view.effective.cash.percent}%</b> <span className="text-xs text-gray-500">({SOURCE_AR[view.effective.cash.source] || view.effective.cash.source})</span></div>
            <div className="border rounded-xl p-3">المحتسب الآن (تأمين): <b>{view.effective.insurance.percent}%</b> <span className="text-xs text-gray-500">({SOURCE_AR[view.effective.insurance.source] || view.effective.insurance.source})</span></div>
            <div className="border rounded-xl p-3">عمولة المزود الخاصة: كاش <b>{view.override.cash ?? '—'}</b> · تأمين <b>{view.override.insurance ?? '—'}</b></div>
          </div>
          {view.promos.length > 0 && (
            <ul className="text-sm space-y-1">
              {view.promos.map((p) => (
                <li key={p.id} className="border rounded-lg p-2 flex flex-wrap gap-x-4 gap-y-1">
                  <b>{p.percent}%</b>
                  <span>{STATE_AR[p.state] || p.state}</span>
                  <span>{day(p.starts_at)} → {day(p.ends_at)}</span>
                  {p.max_orders !== null && <span>الطلبات: {p.used_orders} / {p.max_orders}</span>}
                  {p.note && <span className="text-gray-500">{p.note}</span>}
                </li>
              ))}
            </ul>
          )}
          {can && (
            <>
              <label className="text-sm block">سبب التغيير (يُسجَّل في سجل التدقيق)
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full border rounded p-2" />
              </label>
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <label className="text-sm">كاش %<input type="number" min={0} max={100} step={0.1} dir="ltr" value={own.cash} onChange={(e) => setOwn({ ...own, cash: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">تأمين %<input type="number" min={0} max={100} step={0.1} dir="ltr" value={own.insurance} onChange={(e) => setOwn({ ...own, insurance: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <div className="flex gap-2">
                  <button onClick={saveOwn} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold">حفظ عمولة المزود</button>
                  <button onClick={() => needReason() && call(`/api/admin/admin/provider-commissions/${pid}`, 'DELETE', { reason: reason.trim() })} className="px-4 py-2 border rounded-lg text-sm">إزالة</button>
                </div>
              </div>
              <div className="grid md:grid-cols-5 gap-3 items-end">
                <label className="text-sm">عرض %<input type="number" min={0} max={100} step={0.1} dir="ltr" value={promo.percent} onChange={(e) => setPromo({ ...promo, percent: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">من<input type="date" value={promo.starts_at} onChange={(e) => setPromo({ ...promo, starts_at: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">إلى<input type="date" value={promo.ends_at} onChange={(e) => setPromo({ ...promo, ends_at: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">أو أول N طلب<input type="number" min={1} dir="ltr" value={promo.max_orders} onChange={(e) => setPromo({ ...promo, max_orders: e.target.value })} className="mt-1 w-full border rounded p-2" /></label>
                <div className="flex gap-2">
                  <button onClick={savePromo} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold">حفظ العرض</button>
                  <button onClick={() => needReason() && call(`/api/admin/admin/provider-commissions/${pid}/promo`, 'DELETE', { reason: reason.trim() })} className="px-4 py-2 border rounded-lg text-sm">إلغاء</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
