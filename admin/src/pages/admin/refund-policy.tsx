import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useCan } from '@/components/AdminGuard';
import { POLICY_FIELDS, invalidFields, type RefundPolicy } from '@/lib/refund-policy';

const URL = '/api/admin/admin/refund-policy';

/** Cancellation and refund policy (owner decision 26): every value is editable here and applies to new cancellations at once. */
export default function RefundPolicyPage() {
  const canEdit = useCan('finance.config.edit');
  const [policy, setPolicy] = useState<RefundPolicy | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => apiFetch(URL).then((p: RefundPolicy) => { setPolicy(p); setFailed(false); }).catch(() => setFailed(true));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!policy) return;
    const bad = invalidFields(policy);
    if (bad.length) { setMsg(`قيم غير صالحة: ${bad.join('، ')}`); return; }
    setSaving(true); setMsg('');
    try {
      await apiFetch(URL, { method: 'PUT', body: JSON.stringify(policy) });
      setMsg('تم الحفظ');
    } catch {
      setMsg('تعذر الحفظ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  if (failed) return <div className="p-8" dir="rtl"><p className="mb-3">تعذر تحميل السياسة</p><button onClick={load} className="px-4 py-2 rounded-lg border font-bold">إعادة المحاولة</button></div>;
  if (!policy) return <div className="p-8" dir="rtl">جارٍ التحميل…</div>;

  const setNum = (group: 'consultation' | 'home_visit', key: string, raw: string) =>
    setPolicy({ ...policy, [group]: { ...policy[group], [key]: raw === '' ? NaN : Number(raw) } });

  return (
    <div className="p-8 max-w-3xl" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">سياسة الإلغاء والاسترداد</h1>
      <p className="text-sm opacity-70 mb-6">تُطبَّق القيم على الإلغاءات الجديدة فور الحفظ، وتعود المبالغ إلى وسيلة الدفع الأصلية.</p>
      {(['consultation', 'home_visit'] as const).map((group) => (
        <section key={group} className="mb-6 border rounded-lg p-4">
          <h2 className="font-bold mb-3">{group === 'consultation' ? 'الاستشارات والمواعيد' : 'الزيارات المنزلية والتمريض'}</h2>
          {POLICY_FIELDS.filter((f) => f.group === group).map((f) => {
            const v = (policy[group] as Record<string, number>)[f.key];
            return (
              <label key={f.key} className="flex items-center justify-between gap-3 mb-2 text-sm">
                <span>{f.label}</span>
                <span className="flex items-center gap-2">
                  <input type="number" min={0} max={f.max} step="any" disabled={!canEdit} value={Number.isFinite(v) ? v : ''} onChange={(e) => setNum(group, f.key, e.target.value)} className="w-24 border rounded px-2 py-1" />
                  <span className="w-8 opacity-70">{f.unit}</span>
                </span>
              </label>
            );
          })}
        </section>
      ))}
      <section className="mb-6 border rounded-lg p-4">
        <h2 className="font-bold mb-3">الصيدلية</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!canEdit} checked={policy.pharmacy.refund_delivery_fee_before_dispatch} onChange={(e) => setPolicy({ ...policy, pharmacy: { refund_delivery_fee_before_dispatch: e.target.checked } })} />
          استرداد رسوم التوصيل عند الإلغاء قبل خروج المندوب
        </label>
      </section>
      {canEdit ? <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg border font-bold">{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button> : <p className="text-sm opacity-70">لا تملك صلاحية التعديل (finance.config.edit)</p>}
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
    </div>
  );
}
