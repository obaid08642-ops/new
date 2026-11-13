import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { SEHA_WINDOWS, readSehaMissing, waitingDays, type SehaMissingResult } from '@/lib/seha-missing';

/** Medical reports (sick leave) still without a Seha number after N days: the admin chases the doctor to register them. */
export default function SehaMissingPage() {
  const [days, setDays] = useState<number>(3);
  const [data, setData] = useState<SehaMissingResult | null>(null);
  const [failed, setFailed] = useState(false);

  const load = (d: number) => {
    setData(null); setFailed(false);
    apiFetch(`/api/admin/admin/medical-reports/without-seha-number?days=${d}`).then((r: unknown) => setData(readSehaMissing(r))).catch(() => setFailed(true));
  };
  useEffect(() => { load(days); }, [days]);

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">تقارير طبية بلا رقم صحة</h1>
      <p className="text-sm opacity-70 mb-4">إجازات مرضية صدرت ولم يُسجَّل لها رقم في منصة صحة بعد المدة المختارة. تواصل مع الطبيب من صفحة تدقيق المزودين.</p>
      <div className="flex gap-2 mb-4" role="group" aria-label="المدة بالأيام">
        {SEHA_WINDOWS.map((w) => (
          <button key={w} onClick={() => setDays(w)} aria-pressed={days === w} className={`px-3 py-1 rounded-lg border ${days === w ? 'border-4 font-bold' : ''}`}>{w} أيام</button>
        ))}
      </div>
      {failed ? (
        <div><p className="mb-2">تعذر تحميل القائمة</p><button onClick={() => load(days)} className="px-4 py-2 rounded-lg border font-bold">إعادة المحاولة</button></div>
      ) : data === null ? (
        <p>جارٍ التحميل…</p>
      ) : data.items.length === 0 ? (
        <p>لا توجد تقارير بلا رقم صحة بعد {days} أيام.</p>
      ) : (
        <>
          <p className="mb-2 font-bold">{data.count} تقرير</p>
          <table className="w-full text-sm border">
            <thead><tr className="text-right"><th className="p-2">الرقم التسلسلي</th><th className="p-2">الطبيب</th><th className="p-2">رقم الترخيص</th><th className="p-2">تاريخ الإصدار</th><th className="p-2">المدة (أيام)</th><th className="p-2">منذ</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2" dir="ltr">{r.serial || r.id.slice(0, 8)}</td>
                  <td className="p-2"><a href="/admin/provider-moderation" className="underline">{r.doctor_name || r.doctor_id}</a></td>
                  <td className="p-2" dir="ltr">{r.doctor_license_no || '—'}</td>
                  <td className="p-2" dir="ltr">{String(r.issued_at).slice(0, 10)}</td>
                  <td className="p-2">{r.days ?? '—'}</td>
                  <td className="p-2 font-bold">{waitingDays(r)} يوم</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
