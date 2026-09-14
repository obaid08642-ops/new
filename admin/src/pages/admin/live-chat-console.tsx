import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function LiveChatConsolePage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async()=>{
    setLoading(true); setError('');
    try{ const r:any = await apiFetch('/chat/admin/threads?limit=50'); setThreads(Array.isArray(r?.threads)?r.threads:(Array.isArray(r)?r:[]));}catch(e:any){ setError(e?.message || 'تعذر تحميل المحادثات'); }
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load(); const t=setInterval(load,15000); return()=>clearInterval(t);},[load]);
  return (<><Head><title>الشات الحي | نبض</title></Head>
  <div className="p-8 space-y-6">
   <h1 className="text-2xl font-black">الشات الحي — المحادثات النشطة</h1>
   <p className="text-sm text-slate-500">كل المحادثات بين المرضى والمزودين — تحديث كل 15 ثانية</p>
   {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : threads.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد محادثات نشطة</div> : (
    <div className="space-y-3">{threads.map((th:any)=>(
      <div key={th.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
       <div><div className="font-bold">{th.id?.slice(0,8)} — {th.is_active === false ? 'مغلقة' : 'نشطة'}</div><div className="text-xs text-slate-400">{(th.last_message_at || th.updatedAt || '')?.slice(0,19)}</div><div className="text-xs text-slate-400">المشاركون: {(th.participant_ids || []).length}</div></div>
       <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{th.unread_counts ? Object.values(th.unread_counts as Record<string, unknown>).reduce((a: number, b: unknown) => a + Number(b), 0) : 0} غير مقروءة</span>
      </div>
    ))}</div>
   )}
  </div></>);
}
