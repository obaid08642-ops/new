import React, { useEffect, useState } from 'react';
import { fetchWithAdminGuard } from '@/utils/api';
import { useCan } from '@/components/AdminGuard';

type OwnDelivery = { enabled: boolean; zone_type: 'radius' | 'districts'; radius_km: number | null; district_codes: string[]; fee_sar: number; free_over_sar: number | null };
type District = { code: string; name_ar: string };

const URL_BASE = '/api/admin/admin/pharmacy/delivery-settings';

/** Pharmacy delivery with its own couriers: the admin sees it and can edit it (same endpoint rules as the provider app). */
export default function PharmacyOwnDeliveryAdmin({ accountId, cityCode }: { accountId: string; cityCode?: string }) {
  const canEdit = useCan('facility.edit');
  const [od, setOd] = useState<OwnDelivery | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    let live = true;
    setState('loading');
    fetchWithAdminGuard(`${URL_BASE}/${accountId}`)
      .then(async (r) => { if (!live) return; if (!r.ok) { setState('error'); return; } setOd((await r.json()).own_delivery); setState('ready'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, [accountId]);

  useEffect(() => {
    if (!od?.enabled || od.zone_type !== 'districts' || !cityCode) { setDistricts([]); return; }
    fetchWithAdminGuard(`/api/admin/locations/districts?city=${encodeURIComponent(cityCode)}`)
      .then(async (r) => { if (r.ok) { const d = await r.json(); setDistricts(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []); } })
      .catch(() => setDistricts([]));
  }, [od?.enabled, od?.zone_type, cityCode]);

  const patch = (p: Partial<OwnDelivery>) => setOd((cur) => (cur ? { ...cur, ...p } : cur));

  const save = async () => {
    if (!od) return;
    setBusy(true); setMsg('');
    try {
      const body = od.enabled
        ? { enabled: true, zone_type: od.zone_type, ...(od.zone_type === 'radius' ? { radius_km: od.radius_km } : { district_codes: od.district_codes }), fee_sar: od.fee_sar, free_over_sar: od.free_over_sar }
        : { enabled: false };
      const r = await fetchWithAdminGuard(`${URL_BASE}/${accountId}`, { method: 'PUT', body: JSON.stringify({ own_delivery: body }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg('تعذر الحفظ: ' + (Array.isArray(data?.message) ? data.message[0] : data?.message || r.status)); return; }
      setOd(data.own_delivery); setMsg('تم الحفظ');
    } catch { setMsg('تعذر الاتصال بالخادم.'); } finally { setBusy(false); }
  };

  const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));
  return (
    <section className="rounded-lg border border-gray-200 p-4 space-y-3" aria-label="توصيل الصيدلية بمناديبها">
      <h3 className="font-bold text-gray-700">توصيل الصيدلية بمناديبها الخاصين</h3>
      {state === 'loading' && <p className="text-sm text-gray-500">جارٍ التحميل…</p>}
      {state === 'error' && <p className="text-sm text-red-600">تعذر تحميل إعدادات التوصيل.</p>}
      {state === 'ready' && od && (
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={od.enabled} disabled={!canEdit} onChange={(e) => patch({ enabled: e.target.checked })} />
            <span>توصّل بمناديبها الخاصين (وإلا توصّل المنصة)</span>
          </label>
          {od.enabled && (
            <div className="space-y-3">
              <div className="flex gap-4">
                {(['radius', 'districts'] as const).map((z) => (
                  <label key={z} className="flex items-center gap-1">
                    <input type="radio" name={`zone-${accountId}`} checked={od.zone_type === z} disabled={!canEdit} onChange={() => patch({ zone_type: z })} />
                    {z === 'radius' ? 'نصف قطر حول الصيدلية' : 'أحياء'}
                  </label>
                ))}
              </div>
              {od.zone_type === 'radius' ? (
                <label className="block">نصف القطر (كم)
                  <input className="block border rounded px-2 py-1 w-32" inputMode="decimal" disabled={!canEdit} value={od.radius_km ?? ''} onChange={(e) => patch({ radius_km: num(e.target.value) })} />
                </label>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(districts.length ? districts : od.district_codes.map((c) => ({ code: c, name_ar: c }))).map((d) => {
                    const on = od.district_codes.includes(d.code);
                    return (
                      <button key={d.code} type="button" disabled={!canEdit} aria-pressed={on}
                        className={`px-2 py-1 rounded border ${on ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                        onClick={() => patch({ district_codes: on ? od.district_codes.filter((c) => c !== d.code) : [...od.district_codes, d.code] })}>{d.name_ar}</button>
                    );
                  })}
                </div>
              )}
              <label className="block">رسوم التوصيل (ر.س، الصفر مسموح)
                <input className="block border rounded px-2 py-1 w-32" inputMode="decimal" disabled={!canEdit} value={od.fee_sar} onChange={(e) => patch({ fee_sar: Number(e.target.value) })} />
              </label>
              <label className="block">توصيل مجاني فوق (ر.س، اختياري)
                <input className="block border rounded px-2 py-1 w-32" inputMode="decimal" disabled={!canEdit} value={od.free_over_sar ?? ''} onChange={(e) => patch({ free_over_sar: num(e.target.value) })} />
              </label>
            </div>
          )}
          {canEdit && <button type="button" className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50" disabled={busy} onClick={save}>حفظ</button>}
          {msg && <p role="status" className="text-sm text-gray-600">{msg}</p>}
        </div>
      )}
    </section>
  );
}
