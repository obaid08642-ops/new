import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { useCan } from '../../components/AdminGuard';

export default function AppointmentsOversightPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // Cancelling needs order.cancel on the backend; a read-only role sees the list without the button.
  const canCancel = useCan('order.cancel');
  const load = useCallback(async()=>{
    setLoading(true); setLoadError('');
    try{ const r:any = await apiFetch('/api/admin/admin/appointments?limit=50'); setRows(Array.isArray(r)?r:r?.data||r?.appointments||[]);}catch(e:any){ setLoadError(e?.message||'تعذر تحميل المواعيد'); }
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const cancel = async(id:string)=>{
    // the reason is stored on the appointment and shown to the patient: the admin writes it
    const reason = window.prompt('سبب إلغاء الموعد (يصل إلى المريض):');
    if(reason===null) return;
    if(reason.trim().length<3){ alert('اكتب سبب الإلغاء (3 أحرف على الأقل)'); return; }
    try{ await apiFetch(`/api/admin/admin/appointments/${id}/cancel`,{method:'POST', body: JSON.stringify({reason:reason.trim()})}); await load();}catch(e:any){alert(e?.message||'فشل');}
  };
  return (<><Head><title>إشراف المواعيد | نبض</title></Head>
  <div className="p-8 space-y-6">
   <div className="flex justify-between items-center"><h1 className="text-2xl font-black">إشراف المواعيد</h1><button onClick={()=>load()} className="text-sm text-teal-700 font-bold">تحديث</button></div>
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : loadError? <div role="alert" className="p-8 text-center text-red-700 bg-red-50 rounded-xl border border-red-200">{loadError} <button onClick={()=>load()} className="mr-2 font-bold underline">إعادة المحاولة</button></div> : rows.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد مواعيد</div> : (
    <div className="space-y-3">{rows.map((a:any)=>(
      <div key={a.id} className="bg-white rounded-xl border p-4 flex flex-wrap justify-between items-center gap-3">
       <div><div className="font-bold">{a.patient_name||a.patient_id?.slice(0,8)} → {a.doctor_name||a.provider_name||'—'}</div><div className="text-xs text-slate-400">{a.slot_start?.slice(0,16)||''} · {a.status}</div></div>
       <div className="flex gap-2"><span className={`px-2 py-1 text-xs rounded-full ${a.status==='CONFIRMED'?'bg-green-100 text-green-700': a.status==='CANCELLED'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{a.status}</span>
       {canCancel && a.status!=='CANCELLED' && <button onClick={()=>cancel(a.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg">إلغاء</button>}
       </div>
      </div>
    ))}</div>
   )}
  </div></>);
}
