import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function LoyaltyConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r: any = await apiFetch('/loyalty/config');
      setConfig({ points_per_order: r?.points_per_order ?? 10, referral_points: r?.referral_points ?? 50, tiers: r?.tiers ?? [], earn_ways: r?.earn_ways ?? [] });
    } catch (e: any) { setError(e?.message || 'تعذر تحميل إعدادات الولاء'); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{load();},[load]);
  const save = async () => {
    setSaving(true); setError('');
    try {
      await apiFetch('/loyalty/config', { method:'PUT', body: JSON.stringify({ points_per_order: config?.points_per_order ?? 10, referral_points: config?.referral_points ?? 50 }) });
      alert('تم الحفظ'); await load();
    } catch(e:any){ setError(e?.message||'فشل الحفظ'); }
    finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  return (<><Head><title>إعدادات الولاء | نبض</title></Head>
  <div className="p-8 space-y-6">
   <h1 className="text-2xl font-black">إعداد الولاء والإحالة</h1>
   {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
   <div className="bg-white rounded-xl border p-5 space-y-4">
    <div><label className="block text-sm font-bold mb-1">نقاط لكل طلب (earn per order)</label><input type="number" value={config?.points_per_order ?? 10} onChange={e=>setConfig({...config, points_per_order: parseInt(e.target.value)||0})} className="border rounded px-3 py-2 w-40"/></div>
    <div><label className="block text-sm font-bold mb-1">نقاط الإحالة (referral)</label><input type="number" value={config?.referral_points ?? 50} onChange={e=>setConfig({...config, referral_points: parseInt(e.target.value)||0})} className="border rounded px-3 py-2 w-40"/></div>
    <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">{saving?'...':'حفظ'}</button>
   </div>
   <div className="bg-white rounded-xl border p-5">
    <h2 className="font-black mb-2">المستويات وطرق الكسب (قراءة من الخادم)</h2>
    <ul className="text-sm text-slate-600 space-y-1">{(config?.earn_ways || []).map((w: any, i: number) => <li key={i}>{w?.reason || w?.label || JSON.stringify(w)}: {w?.pts ?? ''}</li>)}</ul>
    <p className="mt-2 text-xs text-slate-400">المستويات: {(config?.tiers || []).map((t: any) => t?.id || t).join('، ')}</p>
   </div>
  </div></>);
}
