import { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { OFFER_VERTICALS, filterOffers, priceText, whereText, type OfferVertical, type ServiceOfferAdminRow } from '@/lib/service-offers';

interface View { vertical: string; total: number; offered: number; items: ServiceOfferAdminRow[] }

/** Service offers (gap G8): which provider offers which approved service, where, with insurance, at what price. Read-only: providers set their own offers. */
export default function ServiceOffersPage() {
  const [vertical, setVertical] = useState<OfferVertical>('lab');
  const [providerId, setProviderId] = useState('');
  const [text, setText] = useState('');
  const [offeredOnly, setOfferedOnly] = useState(true);
  const [view, setView] = useState<View | null>(null);
  const [failed, setFailed] = useState(false);

  // a link from a provider page can carry the account: /admin/service-offers?provider_account_id=...
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('provider_account_id');
    if (id) setProviderId(id);
  }, []);

  const load = (v: OfferVertical, pid: string) => {
    setView(null); setFailed(false);
    const qs = pid.trim() ? `?provider_account_id=${encodeURIComponent(pid.trim())}` : '';
    apiFetch(`/api/admin/admin/service-offers/${v}${qs}`).then((r: View) => setView(r && Array.isArray(r.items) ? r : { vertical: v, total: 0, offered: 0, items: [] })).catch(() => setFailed(true));
  };
  useEffect(() => { load(vertical, providerId); }, [vertical, providerId]);

  const rows = view ? filterOffers(view.items, text, offeredOnly) : [];

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">خدمات المزودين وأسعارها</h1>
      <p className="text-sm opacity-70 mb-4">ما يعرضه كل مزود من الخدمات المعتمدة، وأين يقدمها، وهل يقبل التأمين، وبأي سعر. المزود يضبط عروضه بنفسه من تطبيقه.</p>
      <div className="flex gap-2 mb-4" role="group" aria-label="نوع الخدمة">
        {OFFER_VERTICALS.map((v) => (
          <button key={v.key} onClick={() => setVertical(v.key)} aria-pressed={vertical === v.key} className={`px-3 py-1 rounded-lg border ${vertical === v.key ? 'border-4 font-bold' : ''}`}>{v.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="بحث باسم الخدمة أو المزود" aria-label="بحث" className="border rounded-lg px-3 py-1 w-64" />
        <input value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="معرّف حساب المزود (اختياري)" aria-label="معرّف حساب المزود" className="border rounded-lg px-3 py-1 w-72" dir="ltr" />
        <label className="flex items-center gap-2"><input type="checkbox" checked={offeredOnly} onChange={(e) => setOfferedOnly(e.target.checked)} />المعروضة فقط</label>
      </div>
      {failed ? (
        <div><p className="mb-2">تعذر تحميل العروض</p><button onClick={() => load(vertical, providerId)} className="px-4 py-2 rounded-lg border font-bold">إعادة المحاولة</button></div>
      ) : view === null ? (
        <p>جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <p>لا توجد عروض مطابقة.</p>
      ) : (
        <>
          <p className="text-sm mb-2">{view.offered} معروضة من أصل {view.total}</p>
          <table className="w-full text-sm border">
            <thead><tr className="text-right"><th className="p-2">الخدمة</th><th className="p-2">المزود</th><th className="p-2">معروضة</th><th className="p-2">مكان التقديم</th><th className="p-2">التأمين</th><th className="p-2">السعر</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.provider_account_id}:${r.service_id}`} className="border-t">
                  <td className="p-2">{r.service_name_ar || r.service_name_en || r.service_id}</td>
                  <td className="p-2"><a href="/admin/provider-moderation" className="underline">{r.provider_name_ar || r.provider_name_en || r.provider_account_id}</a></td>
                  <td className="p-2">{r.offered ? 'نعم' : 'لا'}</td>
                  <td className="p-2">{r.offered ? whereText(r.where) : '—'}</td>
                  <td className="p-2">{r.offered ? (r.insurance ? 'يقبل' : 'لا يقبل') : '—'}</td>
                  <td className="p-2">{priceText(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
