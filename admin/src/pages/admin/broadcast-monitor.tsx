import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function BroadcastMonitorPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async()=>{
    setLoading(true);
    try{ const r:any = await apiFetch('/admin/pharmacy/broadcasts?limit=50'); setItems(Array.isArray(r)?r:r?.data||[]);}catch{}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load(); const t=setInterval(load,15000); return()=>clearInterval(t);},[load]);
  const elapsed = (createdAt:string)=>{ const m=Math.floor((Date.now()- new Date(createdAt).getTime())/60000); return m<60? `${m} د` : `${Math.floor(m/60)} س ${m%60}د`; };
  return (<><Head><title>مراقبة البث | نبض</title></Head>
  <div className="p-8 space-y-6">
   <div className="flex justify-between items-center"><h1 className="text-2xl font-black">مراقبة بث الصيدلية</h1><button onClick={()=>load()} className="text-sm text-teal-700 font-bold">تحديث</button></div>
   <p className="text-sm text-slate-500">كل بث: المستلمون، الردود، المهلة، التصعيد — تحديث كل 15 ثانية</p>
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : items.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا يوجد بث نشط</div> : (
    <div className="space-y-3">{items.map((b:any)=>(
      <div key={b.id} className={`bg-white rounded-xl border p-4 ${b.status==='expired'?'border-amber-300 bg-amber-50/20':''}`}>
       <div className="flex justify-between items-start"><div><div className="font-bold">بث #{b.id?.slice(0,8)} — {b.status||'open'}</div><div className="text-xs text-slate-400">منذ {elapsed(b.createdAt||b.created_at)} · {b.recipient_count||b.notified_pharmacies?.length||0} صيدلية · {b.response_count||0} رد</div></div>
       <span className={`px-2 py-1 text-xs rounded-full ${b.status==='open'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}`}>{b.status}</span></div>
       {b.expires_at && <div className="text-xs text-amber-600 mt-2">ينتهي: {new Date(b.expires_at).toLocaleString('ar-SA')}</div>}
      </div>
    ))}</div>
   )}
  </div></>);
}
