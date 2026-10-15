import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { adminFetch, adminMutation, apiErrorMessage, toQuery } from '@/lib/admin-client';
import { useCan } from '@/components/AdminGuard';

/**
 * issue 1235: urgent-alert inbox and rules. The backend evaluator (admin/urgent-alerts) applies these rules every five
 * minutes to the same queries as the today screen and stores each finding once, so an admin who had the screen
 * closed still finds it here (and by e-mail when the rule says so). Endpoints: GET /admin/urgent-alerts,
 * POST /admin/urgent-alerts/:id/read, POST /admin/urgent-alerts/read-all, GET|PUT /admin/urgent-alerts/rules,
 * POST /admin/urgent-alerts/evaluate.
 */

type Kind = 'sla_breach' | 'order_stuck' | 'payment_failures' | 'fraud_high';
type Params = Record<string, string | number | undefined>;
type Alert = { id: string; kind: Kind; severity: 'high' | 'critical'; params: Params; link: string; created_at: string; read: boolean; emailed_at?: string | null };
type AlertPage = { data: Alert[]; total: number; page: number; limit: number; unread: number };
type Rule = { kind: Kind; threshold: number; enabled: boolean; notify_email: boolean };
type Rules = { rules: Rule[]; defaults: Rule[]; updated_at: string | null; updated_by: string | null };
type EvalResult = { created: number; candidates: number; emailed_admins: number };

const LIMIT = 20;
const ORDER_KIND: Record<string, string> = { pharmacy: 'صيدلية', lab: 'تحاليل', radiology: 'أشعة', nursing: 'تمريض', consultation: 'استشارة' };
const fmtDate = (v?: string | number) => (v ? new Date(String(v)).toLocaleString('ar-SA-u-ca-gregory') : '—');
const fmtNum = (v?: string | number) => Number(v || 0).toLocaleString('ar-SA-u-ca-gregory');
const orderRef = (p: Params) => `${ORDER_KIND[String(p.order_kind)] || p.order_kind} ${String(p.order_id || '').slice(0, 8)}`;

const MESSAGE: Record<Kind, (p: Params) => string> = {
  sla_breach: (p) => `طلب ${orderRef(p)} تجاوز مهلة الخدمة (SLA) منذ ${fmtDate(p.sla_due_at)}`,
  order_stuck: (p) => `طلب ${orderRef(p)} عالق في الحالة ${p.state} أكثر من ${fmtNum(p.minutes)} دقيقة`,
  payment_failures: (p) => `${fmtNum(p.count)} مدفوعات فاشلة خلال الساعة الأخيرة (الحد ${fmtNum(p.threshold)})`,
  fraud_high: (p) => `تنبيه احتيال عالي الخطورة: ${p.flag_type} (ثقة ${fmtNum(p.confidence)}%)`,
};

const RULE_META: Record<Kind, { label: string; unit: string; min: number; max: number }> = {
  sla_breach: { label: 'تجاوز مهلة الخدمة (SLA)', unit: 'دقيقة بعد موعد المهلة', min: 0, max: 1440 },
  order_stuck: { label: 'طلب عالق', unit: 'دقيقة في حالة مفتوحة', min: 1, max: 10080 },
  payment_failures: { label: 'مدفوعات فاشلة', unit: 'عملية فاشلة خلال ساعة', min: 1, max: 10000 },
  fraud_high: { label: 'تنبيه احتيال عالي الخطورة', unit: '% حد أدنى للثقة', min: 1, max: 100 },
};

const announceRead = () => window.dispatchEvent(new Event('nabd:alerts-read'));

export default function AlertsPage() {
  const canEditRules = useCan('ops.crons.run');
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [inbox, setInbox] = useState<AlertPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState<Rules | null>(null);
  const [draft, setDraft] = useState<Rule[]>([]);
  const [rulesMsg, setRulesMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadInbox = useCallback(() => {
    setLoading(true);
    adminFetch<AlertPage>(`/api/admin/admin/urgent-alerts${toQuery({ page, limit: LIMIT, filter: unreadOnly ? 'unread' : undefined })}`)
      .then((r) => { setInbox(r); setError(''); })
      .catch((e) => setError(apiErrorMessage(e, 'تعذر تحميل التنبيهات.')))
      .finally(() => setLoading(false));
  }, [page, unreadOnly]);

  const loadRules = useCallback(() => {
    adminFetch<Rules>('/api/admin/admin/urgent-alerts/rules')
      .then((r) => { setRules(r); setDraft(r.rules); })
      .catch((e) => setRulesMsg(apiErrorMessage(e, 'تعذر تحميل قواعد التنبيه.')));
  }, []);

  useEffect(() => { loadInbox(); }, [loadInbox]);
  useEffect(() => { loadRules(); }, [loadRules]);

  async function markRead(id: string) {
    try {
      await adminMutation(`/api/admin/admin/urgent-alerts/${encodeURIComponent(id)}/read`, 'POST');
      announceRead();
      loadInbox();
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذر تعليم التنبيه كمقروء.'));
    }
  }

  async function markAllRead() {
    try {
      await adminMutation('/api/admin/admin/urgent-alerts/read-all', 'POST');
      announceRead();
      loadInbox();
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذر تعليم التنبيهات كمقروءة.'));
    }
  }

  async function saveRules() {
    setBusy(true);
    setRulesMsg('');
    try {
      const saved = await adminMutation<Rules>('/api/admin/admin/urgent-alerts/rules', 'PUT', {
        rules: draft.map((r) => ({ kind: r.kind, threshold: Math.round(Number(r.threshold)), enabled: r.enabled, notify_email: r.notify_email })),
      });
      setRules(saved);
      setDraft(saved.rules);
      setRulesMsg('تم حفظ القواعد.');
    } catch (e) {
      setRulesMsg(apiErrorMessage(e, 'تعذر حفظ القواعد.'));
    } finally {
      setBusy(false);
    }
  }

  async function evaluateNow() {
    setBusy(true);
    setRulesMsg('');
    try {
      const r = await adminMutation<EvalResult>('/api/admin/admin/urgent-alerts/evaluate', 'POST');
      setRulesMsg(`تم التقييم: ${fmtNum(r.created)} تنبيه جديد، أُرسل بريد إلى ${fmtNum(r.emailed_admins)} مشرف.`);
      announceRead();
      loadInbox();
    } catch (e) {
      setRulesMsg(apiErrorMessage(e, 'تعذر تشغيل التقييم.'));
    } finally {
      setBusy(false);
    }
  }

  const setRule = (kind: Kind, patch: Partial<Rule>) => setDraft((d) => d.map((r) => (r.kind === kind ? { ...r, ...patch } : r)));
  const pages = inbox ? Math.max(1, Math.ceil(inbox.total / LIMIT)) : 1;
  const invalid = draft.some((r) => !Number.isInteger(Number(r.threshold)) || Number(r.threshold) < RULE_META[r.kind].min || Number(r.threshold) > RULE_META[r.kind].max);

  return (
    <>
      <Head><title>التنبيهات العاجلة | نبض</title></Head>
      <section dir="rtl" className="space-y-5 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">التنبيهات العاجلة</h1>
            <p className="mt-1 text-xs text-slate-500">تُقيَّم القواعد كل 5 دقائق حتى لو كانت شاشة «اليوم» مغلقة · غير المقروء أولاً</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/today" className="rounded-lg border bg-white px-4 py-2 text-sm font-bold">اليوم</Link>
            <button onClick={markAllRead} disabled={!inbox?.unread} className="rounded-lg border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">تعليم الكل كمقروء</button>
          </div>
        </header>

        {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p> : null}

        <article className="rounded-2xl border bg-white p-4 shadow-sm md:p-6" aria-labelledby="alerts-inbox">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="alerts-inbox" className="text-lg font-bold">صندوق التنبيهات ({fmtNum(inbox?.unread)} غير مقروء)</h2>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={unreadOnly} onChange={(e) => { setPage(1); setUnreadOnly(e.target.checked); }} />
              غير المقروء فقط
            </label>
          </div>
          {inbox?.data.length ? (
            <ul className="mt-3 space-y-2">
              {inbox.data.map((a) => (
                <li key={a.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${a.read ? 'border bg-white text-slate-500' : 'bg-rose-50 font-bold text-rose-800'}`}>
                  <div className="min-w-0 flex-1">
                    <p>{MESSAGE[a.kind] ? MESSAGE[a.kind](a.params || {}) : a.kind}</p>
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      {a.severity === 'critical' ? 'حرج' : 'مرتفع'} · {fmtDate(a.created_at)}{a.emailed_at ? ' · أُرسل بالبريد' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={a.link} className="inline-flex min-h-11 items-center rounded border bg-white px-3 text-xs font-bold text-teal-700">فتح</Link>
                    {!a.read ? (
                      <button onClick={() => markRead(a.id)} className="inline-flex min-h-11 items-center rounded border bg-white px-3 text-xs font-bold text-slate-700">تعليم كمقروء</button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-slate-500">{loading ? 'جارٍ التحميل…' : 'لا توجد تنبيهات.'}</p>}
          {inbox && inbox.total > LIMIT ? (
            <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="الصفحات">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="min-h-11 rounded border bg-white px-4 disabled:opacity-50">السابق</button>
              <span>{fmtNum(page)} / {fmtNum(pages)}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="min-h-11 rounded border bg-white px-4 disabled:opacity-50">التالي</button>
            </nav>
          ) : null}
        </article>

        <article className="rounded-2xl border bg-white p-4 shadow-sm md:p-6" aria-labelledby="alerts-rules">
          <h2 id="alerts-rules" className="text-lg font-bold">قواعد التنبيه</h2>
          <p className="mt-1 text-xs text-slate-500">
            آخر تعديل: {rules?.updated_at ? fmtDate(rules.updated_at) : 'القيم الافتراضية'}
            {canEditRules ? '' : ' · التعديل يتطلب صلاحية تشغيل المهام الدورية'}
          </p>
          <div className="mt-3 space-y-3">
            {draft.map((r) => {
              const meta = RULE_META[r.kind];
              return (
                <fieldset key={r.kind} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center" disabled={!canEditRules || busy}>
                  <legend className="sr-only">{meta.label}</legend>
                  <p className="text-sm font-bold">{meta.label}</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="number" inputMode="numeric" min={meta.min} max={meta.max} step={1}
                      value={r.threshold}
                      onChange={(e) => setRule(r.kind, { threshold: Number(e.target.value) })}
                      className="min-h-11 w-24 rounded border px-2"
                      aria-label={`${meta.label}: ${meta.unit}`}
                    />
                    <span className="text-xs text-slate-500">{meta.unit}</span>
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={r.enabled} onChange={(e) => setRule(r.kind, { enabled: e.target.checked })} />
                    مفعّلة
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={r.notify_email} onChange={(e) => setRule(r.kind, { notify_email: e.target.checked })} />
                    إشعار بالبريد
                  </label>
                </fieldset>
              );
            })}
          </div>
          {rulesMsg ? <p role="status" className="mt-3 text-sm text-slate-700">{rulesMsg}</p> : null}
          {canEditRules ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveRules} disabled={busy || invalid || !draft.length} className="min-h-11 rounded-lg bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">حفظ القواعد</button>
              <button onClick={evaluateNow} disabled={busy} className="min-h-11 rounded-lg border bg-white px-5 py-2 text-sm font-bold disabled:opacity-50">تقييم الآن</button>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}
