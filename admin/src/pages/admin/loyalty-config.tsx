import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function LoyaltyConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r:any = await apiFetch('/loyalty/config'); setConfig(r); } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{load();},[load]);
  const save = async () => {
    setSaving(true);
    try { await apiFetch('/loyalty/config', { method:'PUT', body: JSON.stringify(config) }); alert('تم الحفظ'); } catch(e:any){alert(e?.message||'فشل الحفظ');}
    finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  return (<><Head><title>إعدادات الولاء | نبض</title></Head>
  <div className="p-8 space-y-6">
   <h1 className="text-2xl font-black">إعداد الولاء والإحالة</h1>
   <div className="bg-white rounded-xl border p-5 space-y-4">
    <div><label className="block text-sm font-bold mb-1">نقاط لكل طلب (earn per order)</label><input type="number" value={config?.points_per_order||10} onChange={e=>setConfig({...config, points_per_order: parseInt(e.target.value)||0})} className="border rounded px-3 py-2 w-40"/></div>
    <div><label className="block text-sm font-bold mb-1">نقاط الإحالة (referral)</label><input type="number" value={config?.referral_points||50} onChange={e=>setConfig({...config, referral_points: parseInt(e.target.value)||0})} className="border rounded px-3 py-2 w-40"/></div>
    <button onClick={save} disabled={saving} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50">{saving?'...':'حفظ'}</button>
   </div>
  </div></>);
}
