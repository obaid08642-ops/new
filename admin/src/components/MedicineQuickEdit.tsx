import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { ConfirmDialog } from './ConfirmDialog';
import type { LooseRow } from './DataTable';

/**
 * Quick edit of the fields an admin changes most on a phone: price, prescription flag, controlled flag (decision 10),
 * availability. Routes: PATCH /medicines/admin/catalog/:id (price, requires_prescription, controlled, reason),
 * POST /medicines/admin/catalog/:id/availability (status, reason), GET /medicines/admin/catalog/:id/price-history.
 * Price, prescription and controlled changes go through a confirmation dialog that shows old -> new. Every change
 * needs a typed reason; the backend keeps one history row per changed field (who, when, old -> new, reason).
 */

export const AVAILABILITY_LABELS: Record<string, string> = {
  none: 'متوفر',
  availability_may_be_limited: 'قد يكون غير متوفر',
  admin_flagged_shortage: 'نقص مؤكد (شعار النقص)',
  discontinued: 'متوقف',
};

/** A per-item history row: price rows carry before_price/after_price, every other field { field, before, after }. */
type HistoryRow = {
  id?: string;
  before_price?: number; after_price?: number;
  field?: string; before?: unknown; after?: unknown;
  reason?: string | null; changed_by?: string; changed_by_name?: string | null; createdAt?: string;
};

const HISTORY_FIELD_LABELS: Record<string, string> = {
  requires_prescription: 'وصفة طبية',
  controlled: 'صنف مراقب',
  availability_status: 'التوفر',
  online_exclusive: 'حصري أونلاين',
};

function historyValue(field: string | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (field === 'availability_status' && typeof value === 'string') return AVAILABILITY_LABELS[value] || value;
  if (Array.isArray(value)) return value.join('، ');
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** One history row as "label: old -> new". */
export function describeHistoryRow(h: HistoryRow): { label: string; from: string; to: string } {
  if (h.before_price !== undefined || h.after_price !== undefined) {
    return { label: 'السعر', from: h.before_price === null || h.before_price === undefined ? '—' : String(h.before_price), to: String(h.after_price ?? '—') };
  }
  const field = h.field || '';
  return { label: HISTORY_FIELD_LABELS[field] || field, from: historyValue(field, h.before), to: historyValue(field, h.after) };
}

export type SensitiveChange = { label: string; from: string; to: string };

/** The sensitive fields that differ between the stored item and the new values (shown in the confirm dialog). */
export function sensitiveChanges(stored: LooseRow, next: { price: number; requires_prescription: boolean; controlled?: boolean }): SensitiveChange[] {
  const out: SensitiveChange[] = [];
  if (Number(stored.price || 0) !== Number(next.price || 0)) {
    out.push({ label: 'السعر (ر.س)', from: String(Number(stored.price || 0)), to: String(Number(next.price || 0)) });
  }
  if (!!stored.requires_prescription !== !!next.requires_prescription) {
    out.push({ label: 'يتطلب وصفة طبية', from: stored.requires_prescription ? 'نعم' : 'لا', to: next.requires_prescription ? 'نعم' : 'لا' });
  }
  if (next.controlled !== undefined && !!stored.controlled !== next.controlled) {
    out.push({ label: 'صنف مراقب (لا يُطلب أونلاين)', from: stored.controlled ? 'نعم' : 'لا', to: next.controlled ? 'نعم' : 'لا' });
  }
  return out;
}

export function isPublished(m: LooseRow): boolean {
  return m.medical_review_status === 'approved' || m.public_eligibility === true || m.indexing_eligibility === true;
}

export function SensitiveChangeList({ changes, published }: { changes: SensitiveChange[]; published: boolean }) {
  return (
    <>
      <ul className="space-y-1">
        {changes.map((c) => (
          <li key={c.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-bold">{c.label}</span>
            <span dir="ltr" className="font-mono"><s className="text-slate-400">{c.from}</s> → <b>{c.to}</b></span>
          </li>
        ))}
      </ul>
      {published ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">هذا الصنف منشور: أي تعديل يسحبه من التطبيق حتى يُعتمد طبياً من جديد.</p> : null}
    </>
  );
}

export function MedicineQuickEdit({ medicine, onClose, onSaved }: { medicine: LooseRow; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [price, setPrice] = useState(String(medicine.price ?? ''));
  const [rx, setRx] = useState(!!medicine.requires_prescription);
  const [controlled, setControlled] = useState(!!medicine.controlled);
  const [availability, setAvailability] = useState<string>(medicine.availability_status || 'none');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch<{ data?: HistoryRow[] }>(`/medicines/admin/catalog/${encodeURIComponent(medicine.id)}/price-history?page=1&limit=5`)
      .then((r) => { if (live) setHistory(r?.data || []); })
      .catch(() => { if (live) setHistoryFailed(true); });
    return () => { live = false; };
  }, [medicine.id]);

  const priceNumber = parseFloat(price);
  const priceValid = Number.isFinite(priceNumber) && priceNumber >= 0;
  const changes = priceValid ? sensitiveChanges(medicine, { price: priceNumber, requires_prescription: rx, controlled }) : [];
  const priceChanged = Number(medicine.price || 0) !== priceNumber;
  const rxChanged = !!medicine.requires_prescription !== rx;
  const controlledChanged = !!medicine.controlled !== controlled;
  const availabilityChanged = availability !== (medicine.availability_status || 'none');
  const dirty = changes.length > 0 || availabilityChanged;

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (changes.length) {
        const body: Record<string, unknown> = {};
        body.reason = reason.trim();
        if (priceChanged) body.price = priceNumber;
        if (rxChanged) body.requires_prescription = rx;
        if (controlledChanged) body.controlled = controlled;
        const saved: any = await apiFetch(`/medicines/admin/catalog/${encodeURIComponent(medicine.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
        // F8: without the approve permission the change waits for an approver.
        if (saved?.pending_revision) alert('حُفظ التعديل وينتظر اعتماد مسؤول الكتالوج.');
      }
      if (availabilityChanged) {
        await apiFetch(`/medicines/admin/catalog/${encodeURIComponent(medicine.id)}/availability`, { method: 'POST', body: JSON.stringify({ status: availability, reason: reason.trim() }) });
      }
      setConfirmOpen(false);
      await onSaved();
      onClose();
    } catch (cause) {
      setConfirmOpen(false);
      setError(`فشل الحفظ: ${cause instanceof Error ? cause.message : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!priceValid) { setError('أدخل سعراً صحيحاً.'); return; }
    if (dirty && reason.trim().length < 5) { setError('سبب التغيير مطلوب (5 أحرف على الأقل) — يُحفظ في سجل تغييرات الصنف.'); return; }
    if (changes.length) setConfirmOpen(true);
    else void save();
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form dir="rtl" role="dialog" aria-modal="true" aria-label="تعديل سريع" onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-black text-slate-900">تعديل سريع</h2>
          <p className="mt-1 text-sm text-slate-600">{medicine.name_ar || medicine.name_en}</p>
        </div>

        <label className="block text-sm font-bold text-slate-700">السعر (ر.س)
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" dir="ltr" className="mt-1 w-full rounded border px-3 py-2 font-normal" />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> يتطلب وصفة طبية (Rx)
        </label>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={controlled} onChange={(e) => setControlled(e.target.checked)} /> صنف مراقب (لا يُطلب أونلاين)
        </label>

        <label className="block text-sm font-bold text-slate-700">التوفر
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal">
            {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        {dirty ? (
          <label className="block text-sm font-bold text-slate-700">سبب التغيير (يُسجَّل في سجل تغييرات الصنف)
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" />
          </label>
        ) : null}

        <div>
          <h3 className="text-sm font-black text-slate-700">آخر التغييرات</h3>
          {historyFailed ? <p className="mt-1 text-xs text-rose-600">تعذر تحميل سجل التغييرات.</p> : null}
          {!historyFailed && history === null ? <p className="mt-1 text-xs text-slate-400">جارٍ التحميل…</p> : null}
          {history && history.length === 0 ? <p className="mt-1 text-xs text-slate-400">لا تغييرات مسجلة.</p> : null}
          {history && history.length > 0 ? (
            <ul className="mt-1 space-y-1 text-xs text-slate-600">
              {history.map((h, i) => {
                const row = describeHistoryRow(h);
                return (
                  <li key={h.id ?? i} className="flex flex-wrap justify-between gap-2 border-b py-1">
                    <span className="font-bold">{row.label}</span>
                    <span><s className="text-slate-400">{row.from}</s> → <b>{row.to}</b></span>
                    <span className="truncate">{h.reason || '—'}</span>
                    <span>{h.changed_by_name || h.changed_by || '—'}</span>
                    <span>{h.createdAt ? new Date(h.createdAt).toLocaleDateString('ar-SA-u-ca-gregory') : ''}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-3">
          <button type="submit" disabled={!dirty || busy} className="flex-1 rounded-lg bg-teal-600 py-2 font-bold text-white hover:bg-teal-700 disabled:opacity-50">حفظ</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-200 py-2 font-bold text-gray-800">إغلاق</button>
        </div>
      </form>
    </div>

      <ConfirmDialog open={confirmOpen} title="تأكيد التغيير" confirmLabel="نعم، احفظ" busy={busy} onConfirm={() => void save()} onCancel={() => setConfirmOpen(false)}>
        <SensitiveChangeList changes={changes} published={isPublished(medicine)} />
      </ConfirmDialog>
    </>
  );
}
