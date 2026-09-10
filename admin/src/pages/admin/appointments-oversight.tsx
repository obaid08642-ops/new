import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';

export default function AppointmentsOversightPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async()=>{
    setLoading(true);
    try{ const r:any = await apiFetch('/admin/appointments?limit=50'); setRows(Array.isArray(r)?r:r?.data||r?.appointments||[]);}catch{}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const cancel = async(id:string)=>{
    if(!confirm('إلغاء الموعد؟')) return;
    try{ await apiFetch(`/admin/appointments/${id}/cancel`,{method:'POST', body: JSON.stringify({reason:'admin_cancel'})}); await load();}catch(e:any){alert(e?.message||'فشل');}
  };
  return (<><Head><title>إشراف المواعيد | نبض</title></Head>
  <div className="p-8 space-y-6">
   <div className="flex justify-between items-center"><h1 className="text-2xl font-black">إشراف المواعيد</h1><button onClick={()=>load()} className="text-sm text-teal-700 font-bold">تحديث</button></div>
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : rows.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد مواعيد</div> : (
    <div className="space-y-3">{rows.map((a:any)=>(
      <div key={a.id} className="bg-white rounded-xl border p-4 flex flex-wrap justify-between items-center gap-3">
       <div><div className="font-bold">{a.patient_name||a.patient_id?.slice(0,8)} → {a.doctor_name||a.provider_name||'—'}</div><div className="text-xs text-slate-400">{a.slot_start?.slice(0,16)||''} · {a.status}</div></div>
       <div className="flex gap-2"><span className={`px-2 py-1 text-xs rounded-full ${a.status==='CONFIRMED'?'bg-green-100 text-green-700': a.status==='CANCELLED'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{a.status}</span>
       {a.status!=='CANCELLED' && <button onClick={()=>cancel(a.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg">إلغاء</button>}
       </div>
      </div>
    ))}</div>
   )}
  </div></>);
}
