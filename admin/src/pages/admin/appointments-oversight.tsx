import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { useCan } from '../../components/AdminGuard';
import { ConfirmDialog } from '../../components/ConfirmDialog';

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
  // the reason is stored on the appointment and shown to the patient: the admin writes it in the dialog
  const [cancelFor, setCancelFor] = useState<string|null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState(false);
  const closeCancel = ()=>{ setCancelFor(null); setReasonText(''); setReasonError(''); };
  const confirmCancel = async()=>{
    if(cancelFor===null) return;
    const reason = reasonText.trim();
    if(reason.length<3){ setReasonError('اكتب سبب الإلغاء (3 أحرف على الأقل)'); return; }
    setBusy(true);
    try{ await apiFetch(`/api/admin/admin/appointments/${cancelFor}/cancel`,{method:'POST', body: JSON.stringify({reason})}); closeCancel(); await load();}
    catch(e:any){ setReasonError(e?.message||'فشل'); }
    finally{ setBusy(false); }
  };
  return (<><Head><title>إشراف المواعيد | نبض</title></Head>
  <div className="p-8 space-y-6">
   <div className="flex justify-between items-center"><h1 className="text-2xl font-black">إشراف المواعيد</h1><button onClick={()=>load()} className="text-sm text-teal-700 font-bold">تحديث</button></div>
   {loading? <div className="p-8 text-center">جاري التحميل...</div> : loadError? <div role="alert" className="p-8 text-center text-red-700 bg-red-50 rounded-xl border border-red-200">{loadError} <button onClick={()=>load()} className="mr-2 font-bold underline">إعادة المحاولة</button></div> : rows.length===0? <div className="p-8 text-center text-slate-400 bg-white rounded-xl border">لا توجد مواعيد</div> : (
    <div className="space-y-3">{rows.map((a:any)=>(
      <div key={a.id} className="bg-white rounded-xl border p-4 flex flex-wrap justify-between items-center gap-3">
       <div><div className="font-bold">{a.patient_name||a.patient_id?.slice(0,8)} → {a.doctor_name||a.provider_name||'—'}</div><div className="text-xs text-slate-400">{a.slot_start?.slice(0,16)||''} · {a.status}</div></div>
       <div className="flex gap-2"><span className={`px-2 py-1 text-xs rounded-full ${a.status==='CONFIRMED'?'bg-green-100 text-green-700': a.status==='CANCELLED'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{a.status}</span>
       {canCancel && a.status!=='CANCELLED' && <button onClick={()=>setCancelFor(a.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg">إلغاء</button>}
       </div>
      </div>
    ))}</div>
   )}
   <ConfirmDialog open={cancelFor!==null} title="سبب إلغاء الموعد" confirmLabel="إلغاء الموعد" busy={busy} onConfirm={confirmCancel} onCancel={closeCancel}>
    <p className="text-slate-600">يصل السبب إلى المريض.</p>
    <textarea value={reasonText} onChange={(e)=>setReasonText(e.target.value)} rows={3} aria-label="سبب إلغاء الموعد" className="w-full rounded-lg border p-2" />
    {reasonError ? <p role="alert" className="text-sm text-rose-700">{reasonError}</p> : null}
   </ConfirmDialog>
  </div></>);
}
