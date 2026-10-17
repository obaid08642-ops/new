import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { adminFetch, apiErrorMessage } from '@/lib/admin-client';
import { DataTable } from '@/components/DataTable';
import { LOG_LANGS, LOG_LANG_DIR, LOG_LANG_LOCALE, LOG_LANG_NAMES, LOG_MESSAGES, fmt, type LogLang } from '@/utils/app-logs-i18n';
import { EMPTY_FILTERS, logsQuery, logsToCsv, rangeIsInvalid, readLang, saveLang, type LogFilters, type LogLine, type LogsResponse, type RequestLogsResponse } from '@/utils/app-logs';

/**
 * 20.3 system logs: the warn and error lines stored in `app_logs` (GET /admin/logs, permission system.logs.view), with
 * filters, a line-details panel, every stored line of one request (GET /admin/logs/request/:id) and a CSV of the rows on
 * screen. Read-only. All texts come from utils/app-logs-i18n.ts (six languages).
 */
const LEVEL_STYLE: Record<LogLine['level'], string> = {
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function LogsPage() {
  const [lang, setLang] = useState<LogLang>('ar');
  const t = LOG_MESSAGES[lang];
  const [draft, setDraft] = useState<LogFilters>(EMPTY_FILTERS);
  // what is on screen: the applied filters and the page; changing it (go) reloads
  const [view, setView] = useState<{ filters: LogFilters; page: number }>({ filters: EMPTY_FILTERS, page: 1 });
  const { page } = view;
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LogLine | null>(null);
  const [request, setRequest] = useState<RequestLogsResponse | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // the saved language is read after hydration (the server renders Arabic); a microtask keeps the state update out of the effect body
  useEffect(() => { queueMicrotask(() => setLang(readLang())); }, []);
  const changeLang = (next: LogLang) => { setLang(next); saveLang(next); };

  useEffect(() => {
    let cancelled = false;
    adminFetch<LogsResponse>(`/api/admin/admin/logs${logsQuery(view.filters, view.page)}`)
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((cause) => { if (!cancelled) { setData(null); setError(apiErrorMessage(cause, LOG_MESSAGES[readLang()].error_load)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view]);
  const go = (next: { filters: LogFilters; page: number }) => { setLoading(true); setSelected(null); setRequest(null); setView(next); };

  const invalidRange = rangeIsInvalid(draft);
  const apply = (event: React.FormEvent) => { event.preventDefault(); if (invalidRange) return; go({ filters: { ...draft }, page: 1 }); };
  const reset = () => { setDraft(EMPTY_FILTERS); go({ filters: EMPTY_FILTERS, page: 1 }); };

  async function openRequest(line: LogLine) {
    if (!line.request_id) return;
    setRequestLoading(true); setRequest(null);
    try { setRequest(await adminFetch<RequestLogsResponse>(`/api/admin/admin/logs/request/${encodeURIComponent(line.request_id)}`)); }
    catch (cause) { setError(apiErrorMessage(cause, t.error_load)); }
    finally { setRequestLoading(false); }
  }

  function exportCsv() {
    if (!data?.data.length) return;
    const url = URL.createObjectURL(new Blob([logsToCsv(data.data)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `nabd-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const when = useMemo(() => new Intl.DateTimeFormat(LOG_LANG_LOCALE[lang], { dateStyle: 'short', timeStyle: 'medium' }), [lang]);
  const levelName = (l: LogLine['level']) => (l === 'error' ? t.level_error : t.level_warn);
  const field = 'w-full rounded border p-2 text-sm';
  const mono = 'font-mono text-xs';

  return (
    <>
      <Head><title>{t.title}</title></Head>
      <section dir={LOG_LANG_DIR[lang]} lang={lang} className="space-y-6 p-6 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
          </div>
          <label className="text-sm">
            <span className="me-2 text-slate-600">{t.language}</span>
            <select value={lang} onChange={(e) => changeLang(e.target.value as LogLang)} className="rounded border p-2 text-sm">
              {LOG_LANGS.map((l) => <option key={l} value={l}>{LOG_LANG_NAMES[l]}</option>)}
            </select>
          </label>
        </header>

        <form onSubmit={apply} aria-label={t.filters} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.level}</span>
              <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as LogFilters['level'] })} className={field}>
                <option value="">{t.level_all}</option><option value="warn">{t.level_warn}</option><option value="error">{t.level_error}</option>
              </select></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.from}</span>
              <input type="datetime-local" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={field} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.to}</span>
              <input type="datetime-local" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={field} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.module}</span>
              <input value={draft.module} maxLength={64} placeholder={t.module_ph} onChange={(e) => setDraft({ ...draft, module: e.target.value })} className={`${field} ${mono}`} dir="ltr" /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.request_id}</span>
              <input value={draft.request_id} maxLength={128} placeholder={t.request_id_ph} onChange={(e) => setDraft({ ...draft, request_id: e.target.value })} className={`${field} ${mono}`} dir="ltr" /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">{t.search}</span>
              <input value={draft.q} maxLength={100} placeholder={t.search_ph} onChange={(e) => setDraft({ ...draft, q: e.target.value })} className={field} /></label>
          </div>
          {invalidRange ? <p role="alert" className="mt-3 text-sm text-rose-700">{t.invalid_range}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button disabled={invalidRange} className="rounded bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{t.apply}</button>
            <button type="button" onClick={reset} className="rounded border px-4 py-2 text-sm font-bold">{t.reset}</button>
            <button type="button" onClick={exportCsv} disabled={!data?.data.length} className="rounded border px-4 py-2 text-sm font-bold disabled:opacity-50">{t.export_csv}</button>
          </div>
        </form>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        <article className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600" aria-live="polite">
            <span>{loading ? t.loading : data ? (data.total_capped ? fmt(t.total_capped, { n: data.total.toLocaleString(LOG_LANG_LOCALE[lang]) }) : fmt(t.total, { n: data.total.toLocaleString(LOG_LANG_LOCALE[lang]) })) : ''}</span>
            {data ? <span>{fmt(t.page_of, { page: data.page.toLocaleString(LOG_LANG_LOCALE[lang]), pages: data.pages.toLocaleString(LOG_LANG_LOCALE[lang]) })}</span> : null}
          </div>
          <DataTable<LogLine>
            bare
            dense
            dir={LOG_LANG_DIR[lang]}
            rows={data?.data ?? []}
            loading={loading}
            loadingText={t.loading}
            emptyText={t.empty}
            getRowKey={(row) => row.id}
            onRowClick={(row) => { setSelected(row); setRequest(null); }}
            columns={[
              { key: 'ts', header: t.col_time, label: t.col_time, className: 'whitespace-nowrap text-xs', render: (r) => when.format(new Date(r.ts)) },
              { key: 'level', header: t.col_level, label: t.col_level, render: (r) => <span className={`rounded border px-2 py-0.5 text-xs font-bold ${LEVEL_STYLE[r.level]}`}>{levelName(r.level)}</span> },
              { key: 'service', header: t.col_service, label: t.col_service, className: mono, render: (r) => r.service },
              { key: 'module', header: t.col_module, label: t.col_module, className: mono, render: (r) => r.module },
              { key: 'event', header: t.col_event, label: t.col_event, className: mono, render: (r) => r.event },
              { key: 'route', header: t.col_route, label: t.col_route, className: `max-w-xs truncate ${mono}`, render: (r) => r.route || '—' },
              { key: 'status', header: t.col_status, label: t.col_status, render: (r) => r.status ?? '—' },
              { key: 'duration', header: t.col_duration, label: t.col_duration, render: (r) => r.duration_ms ?? '—' },
              { key: 'request', header: t.col_request, label: t.col_request, className: `max-w-[10rem] truncate ${mono}`, render: (r) => r.request_id || '—' },
              { key: 'actions', header: '', label: '', actions: true, render: (r) => <button onClick={(e) => { e.stopPropagation(); setSelected(r); setRequest(null); }} className="rounded border px-2 py-1 text-xs">{t.open_details}</button> },
            ]}
          />
          {data && data.pages > 1 ? (
            <nav className="flex items-center justify-between gap-2" aria-label={fmt(t.page_of, { page: data.page, pages: data.pages })}>
              <button disabled={loading || page <= 1} onClick={() => go({ filters: view.filters, page: page - 1 })} className="rounded border px-3 py-1.5 text-sm font-bold disabled:opacity-50">{t.prev}</button>
              <button disabled={loading || page >= data.pages} onClick={() => go({ filters: view.filters, page: page + 1 })} className="rounded border px-3 py-1.5 text-sm font-bold disabled:opacity-50">{t.next}</button>
            </nav>
          ) : null}
          {data ? (
            <p className="text-xs text-slate-500">
              {fmt(t.retention, { days: data.retention_days })}
              {data.dropped_in_this_process ? ` ${fmt(t.dropped, { n: data.dropped_in_this_process })}` : ''}
            </p>
          ) : null}
        </article>

        {selected ? (
          <aside aria-label={t.details_title} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{t.details_title}</h2>
              <button onClick={() => { setSelected(null); setRequest(null); }} className="rounded border px-3 py-1 text-sm">{t.close}</button>
            </div>
            <dl className="grid gap-x-4 gap-y-1 text-sm md:grid-cols-2" dir="ltr">
              {([['ts', selected.ts], ['level', selected.level], ['service', selected.service], ['module', selected.module], ['event', selected.event], ['request_id', selected.request_id], ['user_id', selected.user_id], ['route', selected.route], ['status', selected.status], ['duration_ms', selected.duration_ms]] as const).map(([k, v]) => (
                <div key={k} className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">{k}</dt><dd className={`${mono} break-all`}>{v ?? '—'}</dd></div>
              ))}
            </dl>
            {selected.details ? <pre dir="ltr" className={`${mono} max-h-72 overflow-auto rounded bg-slate-50 p-3 text-start`}>{JSON.stringify(selected.details, null, 2)}</pre> : <p className="text-sm text-slate-500">{t.details_none}</p>}
            {selected.request_id ? <button disabled={requestLoading} onClick={() => void openRequest(selected)} className="rounded bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{t.request_lines}</button> : null}
            {requestLoading ? <p className="text-sm text-slate-500">{t.loading}</p> : null}
            {request ? (
              <div className="space-y-2">
                <h3 className="font-bold">{t.request_title} <span className="text-sm font-normal text-slate-500">{fmt(t.request_count, { n: request.count })}</span></h3>
                {request.data.length ? (
                  <ol className="space-y-1 text-sm">
                    {request.data.map((l) => (
                      <li key={l.id} className="rounded border p-2" dir="ltr">
                        <span className={`${mono} text-slate-500`}>{when.format(new Date(l.ts))}</span>{' '}
                        <span className={`rounded border px-1.5 text-xs font-bold ${LEVEL_STYLE[l.level]}`}>{levelName(l.level)}</span>{' '}
                        <span className={mono}>{l.module} · {l.event}{l.status ? ` · ${l.status}` : ''}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-slate-500">{t.request_empty}</p>}
              </div>
            ) : null}
          </aside>
        ) : null}
      </section>
    </>
  );
}
