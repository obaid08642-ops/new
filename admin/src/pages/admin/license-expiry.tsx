import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { WINDOWS, expiryState, expiryText, type LicenseExpiryRow } from '@/lib/license-expiry';

const STATE_STYLE = { expired: 'font-bold underline', urgent: 'font-bold', upcoming: '' } as const;

/** Licences expiring (owner decision 37): every provider whose licence ends within the chosen window, expired ones always included. */
export default function LicenseExpiryPage() {
  const [days, setDays] = useState<number>(60);
  const [rows, setRows] = useState<LicenseExpiryRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = (d: number) => {
    setRows(null); setFailed(false);
    apiFetch(`/api/admin/admin/providers/license-expiry?within_days=${d}`).then((r: LicenseExpiryRow[]) => setRows(Array.isArray(r) ? r : [])).catch(() => setFailed(true));
  };
  useEffect(() => { load(days); }, [days]);

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">تراخيص قاربت على الانتهاء</h1>
      <p className="text-sm opacity-70 mb-4">المنتهية تظهر دائماً. الترخيص المنتهي يوقف الحساب تلقائياً، ويُعاد التفعيل بعد إدخال التاريخ الجديد.</p>
      <div className="flex gap-2 mb-4" role="group" aria-label="النافذة الزمنية">
        {WINDOWS.map((w) => (
          <button key={w} onClick={() => setDays(w)} aria-pressed={days === w} className={`px-3 py-1 rounded-lg border ${days === w ? 'border-4 font-bold' : ''}`}>{w} يوم</button>
        ))}
      </div>
      {failed ? (
        <div><p className="mb-2">تعذر تحميل القائمة</p><button onClick={() => load(days)} className="px-4 py-2 rounded-lg border font-bold">إعادة المحاولة</button></div>
      ) : rows === null ? (
        <p>جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <p>لا توجد تراخيص تنتهي خلال {days} يوماً.</p>
      ) : (
        <table className="w-full text-sm border">
          <thead><tr className="text-right"><th className="p-2">المزود</th><th className="p-2">النوع</th><th className="p-2">تاريخ الانتهاء</th><th className="p-2">المتبقي</th><th className="p-2">الحالة</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2"><a href="/admin/provider-moderation" className="underline">{r.display_name_ar || r.display_name_en || r.id}</a></td>
                <td className="p-2">{r.type || '—'}</td>
                <td className="p-2" dir="ltr">{String(r.license_expiry_date).slice(0, 10)}</td>
                <td className={`p-2 ${STATE_STYLE[expiryState(r)]}`}>{expiryText(r)}</td>
                <td className="p-2">{r.suspended_reason ? 'موقوف' : (r.status || '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
