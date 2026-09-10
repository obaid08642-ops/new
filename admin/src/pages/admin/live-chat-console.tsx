import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function LiveChatConsolePage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async()=>{
    setLoading(true);
    try{ const r:any = await apiFetch('/chat/threads?limit=50'); setThreads(Array.isArray(r)?r:r?.data||[]);}catch{}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load(); const t=setInterval(load,15000); return()=>clearInterval(t);},[load]);
  return (<><Head><title>الشات الحي | نبض</title></Head>
  <div className="p-8 space-y-6">
   <h1 className="text-2xl font-black">الشات الحي — المحادثات النشطة</h1>
   <p className="text-sm text-slate-500">كل المحادثات بين المرضى والمزودين — تحديث كل 15 ثانية</p>
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : threads.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد محادثات نشطة</div> : (
    <div className="space-y-3">{threads.map((th:any)=>(
      <div key={th.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
       <div><div className="font-bold">{th.id?.slice(0,8)} — {th.status||'open'}</div><div className="text-xs text-slate-400">{th.updatedAt?.slice(0,19)||''}</div></div>
       <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{th.message_count||0} رسائل</span>
      </div>
    ))}</div>
   )}
  </div></>);
}
