import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { apiFetch } from '../../utils/api';
import { DataTable } from '@/components/DataTable';
import { useCan } from '@/components/AdminGuard';
import { LOG_LANGS, LOG_LANG_DIR, LOG_LANG_LOCALE, LOG_LANG_NAMES, type LogLang } from '@/utils/app-logs-i18n';
import { readLang, saveLang } from '@/utils/app-logs';
import { GUEST_JOB_MESSAGES } from '@/utils/guest-jobs-i18n';

type Status = 'draft' | 'published' | 'closed';
type GuestJob = {
  id: string; title: string; description: string; scfhs_role: string; location: string; salary_range?: string; company?: string;
  contact_phone?: string; post_type?: 'offer' | 'request'; status: Status; review_note?: string; reviewed_by?: string; reviewed_at?: string; createdAt?: string;
};

const STATUS_KEY = { draft: 'status_draft', published: 'status_published', closed: 'status_closed' } as const;
const ROLE_KEY: Record<string, 'role_doctor' | 'role_pharmacist' | 'role_nurse' | 'role_lab' | 'role_radiology'> = {
  doctor: 'role_doctor', pharmacist: 'role_pharmacist', nurse: 'role_nurse', lab: 'role_lab', radiology: 'role_radiology',
};

/** Guest job posts (no account) wait here as drafts; an admin publishes or rejects each one, with a reason recorded. Six languages, like the Logs page. */
export default function GuestJobsPage() {
  const canEdit = useCan('facility.edit');
  const [lang, setLang] = useState<LogLang>('ar');
  const t = GUEST_JOB_MESSAGES[lang];
  const [status, setStatus] = useState<Status>('draft');
  const [rows, setRows] = useState<GuestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [problem, setProblem] = useState<'' | 'reason' | 'action'>('');
  const [notice, setNotice] = useState<'' | 'published' | 'rejected'>('');
  const [selected, setSelected] = useState<GuestJob | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // the saved language is read after hydration (the server renders Arabic)
  useEffect(() => { queueMicrotask(() => setLang(readLang())); }, []);
  const changeLang = (next: LogLang) => { setLang(next); saveLang(next); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRows(await apiFetch<GuestJob[]>(`/admin/admin/recruitment/guest-jobs?status=${status}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function decide(decision: 'publish' | 'reject') {
    if (!selected) return;
    if (note.trim().length < 3) { setProblem('reason'); return; }
    setBusy(true); setProblem('');
    try {
      await apiFetch(`/admin/admin/recruitment/guest-jobs/${encodeURIComponent(selected.id)}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, note: note.trim() }),
      });
      setNotice(decision === 'publish' ? 'published' : 'rejected');
      setSelected(null); setNote('');
      await load();
    } catch {
      setProblem('action');
    } finally {
      setBusy(false);
    }
  }

  const when = (v?: string) => (v ? new Date(v).toLocaleString(LOG_LANG_LOCALE[lang]) : '—');
  const roleName = (r: string) => (ROLE_KEY[r] ? t[ROLE_KEY[r]] : r);
  const typeName = (p?: string) => (p === 'request' ? t.type_request : t.type_offer);
  const errorText = error ? t.error_load : problem === 'reason' ? t.reason_required : problem === 'action' ? t.error_action : '';

  return (
    <>
      <Head><title>{`${t.title} | Nabd Plus`}</title></Head>
      <section dir={LOG_LANG_DIR[lang]} lang={lang} className="p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label={t.language} className="rounded-lg border px-3 py-2 text-sm" value={lang} onChange={(e) => changeLang(e.target.value as LogLang)}>
              {LOG_LANGS.map((l) => <option key={l} value={l}>{LOG_LANG_NAMES[l]}</option>)}
            </select>
            <select aria-label={t.status} className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as Status); setSelected(null); }}>
              <option value="draft">{t.status_draft}</option>
              <option value="published">{t.status_published}</option>
              <option value="closed">{t.status_closed}</option>
            </select>
            <button onClick={() => void load()} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{t.refresh}</button>
          </div>
        </div>
        {errorText ? <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{errorText}</p> : null}
        {notice ? <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{notice === 'published' ? t.published_ok : t.rejected_ok}</p> : null}
        <DataTable
          rows={rows}
          getRowKey={(row) => row.id}
          loading={loading}
          loadingText={t.loading}
          emptyText={status === 'draft' ? t.empty_draft : t.empty_other}
          columns={[
            { key: 'title', header: t.col_title, render: (row) => <span className="text-sm font-medium text-slate-900">{row.title}</span> },
            { key: 'role', header: t.col_role, render: (row) => roleName(row.scfhs_role) },
            { key: 'location', header: t.col_city, render: (row) => row.location },
            { key: 'type', header: t.col_type, render: (row) => typeName(row.post_type) },
            { key: 'when', header: t.col_when, className: 'text-xs text-slate-500', render: (row) => when(row.createdAt) },
            { key: 'open', header: '', render: (row) => <button onClick={() => { setSelected(row); setNote(''); setNotice(''); setProblem(''); }} className="rounded border px-3 py-1 text-xs font-semibold">{t.details}</button> },
          ]}
        />
        {selected ? (
          <aside aria-label={t.details_label} className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="rounded border px-3 py-1 text-xs">{t.close}</button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><dt className="text-slate-500">{t.company}</dt><dd className="font-semibold">{selected.company || '—'}</dd></div>
              <div><dt className="text-slate-500">{t.salary}</dt><dd className="font-semibold">{selected.salary_range || '—'}</dd></div>
              <div><dt className="text-slate-500">{t.contact}</dt><dd className="font-semibold" dir="ltr">{selected.contact_phone || '—'}</dd></div>
              <div><dt className="text-slate-500">{t.state}</dt><dd className="font-semibold">{t[STATUS_KEY[selected.status]]}</dd></div>
            </dl>
            {selected.status === 'draft' && canEdit ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">{t.reason}
                  <textarea className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => void decide('publish')} className="rounded bg-teal-700 px-3 py-2 text-sm font-bold text-white">{t.publish}</button>
                  <button disabled={busy} onClick={() => void decide('reject')} className="rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700">{t.reject}</button>
                </div>
              </div>
            ) : selected.status !== 'draft' ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{t.decision}: {t[STATUS_KEY[selected.status]]} · {when(selected.reviewed_at)} · {t.reviewer} {selected.reviewed_by ?? '—'} · {t.reason_label}: {selected.review_note ?? '—'}</p>
            ) : null}
          </aside>
        ) : null}
      </section>
    </>
  );
}
