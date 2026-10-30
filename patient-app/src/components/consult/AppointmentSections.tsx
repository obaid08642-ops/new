/**
 * The sections of the appointment page that used to be three screens (merge map 2, section 1): the doctor's summary
 * (was /consultations/summary), the prescription (was /consultations/prescription-from-doctor) and the follow-up with the
 * status history (was /consultations/follow-up). All four read the same appointment: GET /care/appointments/:id (the page),
 * GET /care/appointments/:id/summary, and GET /prescriptions/active for the one issued for this appointment. A part the
 * server did not send is not drawn.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../../packages/ui-native/src';
import { RX_TONE, InfoRow, Section, StatusTag, appointmentStatus, useConsultFormat } from './ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { useCart } from '../../context/CartContext';
import { useDiagnosticsCart } from '../../context/DiagnosticsCartContext';
import { hasOutcomes, readOutcomes, type OutcomeReport, type ReferralItem, type VisitOutcomes } from '../../utils/appointmentOutcomes';
import { markOutcomesSeen } from '../../hooks/useNewOutcomesCount';
import { normalizeLabService, recordOf } from '../../utils/labMappers';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { toMedicationViews, reminderPayload, type MedicationView } from '../../utils/prescription-view';

export interface Med {
  medicine_name?: string;
  dose?: string;
  duration?: string;
  notes?: string;
}
export interface Summary {
  doctor_id?: string;
  diagnosis?: string;
  prescription?: Med[];
  notes?: string;
  recommendations?: string;
  follow_up_recommended?: boolean;
  follow_up_window_days?: number;
}
interface Lab {
  id?: string;
  name?: string;
  instructions?: string;
}
interface Prescription {
  id?: string;
  doctor?: string;
  spec?: string;
  date?: string;
  diagnosis?: string;
  notes?: string;
  labs?: Lab[];
  [key: string]: unknown;
}
export interface HistoryRow {
  state?: string;
  at?: string;
  note?: string;
}

type Load<T> = { state: 'loading' | 'missing' | 'error' | 'ready'; data: T | null; retry: () => void };

/** One GET for a section; a 404 is "not written yet", anything else is an error with a retry. */
function useSection<T>(path: string, enabled: boolean, pick: (raw: unknown) => T | null): Load<T> {
  const [state, setState] = useState<Load<T>['state']>('loading');
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState('loading');
    apiFetch<unknown>(path)
      .then((raw) => {
        if (!alive) return;
        const value = pick(raw);
        setData(value);
        setState(value ? 'ready' : 'missing');
      })
      .catch((e) => {
        if (!alive) return;
        const msg = String(e instanceof Error ? e.message : '');
        if (msg.includes('404') || msg.includes('not available') || msg.includes('غير موجود')) setState('missing');
        else {
          logError('consultations:appointment-section', e);
          setState('error');
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, tick]);
  return { state, data, retry: () => setTick((n) => n + 1) };
}

function TextBlock({ title, text }: { title: string; text: string }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Section title={title}>
      <Card theme={theme}>
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.primary, ...flow }}>{text}</Text>
      </Card>
    </Section>
  );
}

function SectionNote({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Card theme={theme}>
      <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{text}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 10 }}>
          <Button label={actionLabel} variant="outline" size="md" fullWidth onPress={onAction} theme={theme} />
        </View>
      ) : null}
    </Card>
  );
}

/** Opens the booking with the doctor pre-selected and the original appointment in the URL (`?followUp=`). */
export function openFollowUp(doctorId: string, appointmentId: string) {
  router.push({ pathname: '/consultations/book/[id]', params: { id: doctorId, followUp: appointmentId } } as unknown as Href);
}

/** The doctor's write-up of the visit, with the follow-up offer when the doctor recommended one. */
export function SummarySection({ appointmentId, doctorId, onSummary }: { appointmentId: string; doctorId: string; onSummary?: (s: Summary | null) => void }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const load = useSection<Summary>(`/care/appointments/${encodeURIComponent(appointmentId)}/summary`, Boolean(appointmentId), (raw) => (raw && typeof raw === 'object' ? (raw as Summary) : null));
  const summary = load.data;
  useEffect(() => {
    onSummary?.(summary);
  }, [summary, onSummary]);
  // Only the window the server sends; no invented 7 days or price promise (needs-review issue 803).
  const windowDays = summary?.follow_up_window_days;
  return (
    <Section title={k('consult.summary.title')}>
      {load.state === 'loading' ? null : load.state === 'error' ? (
        <SectionNote text={k('consult.summary.loadError')} actionLabel={k('consult.retry')} onAction={load.retry} />
      ) : !summary ? (
        <SectionNote text={`${k('consult.summary.notReady')}. ${k('consult.summary.notReadyBody')}`} />
      ) : (
        <View style={{ gap: 12 }}>
          {summary.follow_up_recommended && (doctorId || summary.doctor_id) ? (
            <Card theme={theme}>
              <View style={{ gap: 8 }}>
                {typeof windowDays === 'number' ? <StatusTag label={k('consult.summary.window', { n: num(windowDays) })} tone="info" /> : null}
                {typeof windowDays === 'number' ? <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('consult.summary.followUpBody', { n: num(windowDays) })}</Text> : null}
                <Button label={k('consult.summary.bookFollowUp')} size="md" fullWidth onPress={() => openFollowUp(doctorId || summary.doctor_id || '', appointmentId)} theme={theme} testID="summary-follow-up" />
              </View>
            </Card>
          ) : null}
          {summary.diagnosis ? <TextBlock title={k('consult.rx.diagnosis')} text={summary.diagnosis} /> : null}
          {summary.notes ? <TextBlock title={k('consult.rx.notes')} text={summary.notes} /> : null}
          {summary.recommendations ? <TextBlock title={k('consult.summary.recommendations')} text={summary.recommendations} /> : null}
        </View>
      )}
    </Section>
  );
}

/** The prescription issued for this appointment: medicines, reminders, the order, the requested tests. */
export function PrescriptionSection({ appointmentId, fallback }: { appointmentId: string; fallback?: Med[] }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { date } = useConsultFormat();
  const { addItem } = useCart();
  const [added, setAdded] = useState<string[]>([]);
  const [ordering, setOrdering] = useState(false);
  const pick = useCallback(
    (response: unknown): Prescription | null => {
      const body = response as { data?: unknown } | unknown[] | null;
      const raw = Array.isArray(body) ? body : (body as { data?: unknown } | null)?.data;
      const list = (Array.isArray(raw) ? raw : []) as Prescription[];
      return list.find((p) => String(p.appointment_id ?? p.appointmentId ?? '') === String(appointmentId)) ?? null;
    },
    [appointmentId],
  );
  const load = useSection<Prescription>('/prescriptions/active', Boolean(appointmentId), pick);
  const prescription = load.data;
  const medications: MedicationView[] = useMemo(() => toMedicationViews(prescription), [prescription]);

  /** Creates the reminder on the server; the row is marked added only when that succeeded. */
  const createReminder = async (med: MedicationView): Promise<boolean> => {
    try {
      await apiFetch('/health/reminders', { method: 'POST', body: JSON.stringify(reminderPayload(med, prescription?.id)) });
      setAdded((p) => (p.includes(med.id) ? p : [...p, med.id]));
      return true;
    } catch (e) {
      logError('consultations:prescription:reminder', e);
      return false;
    }
  };
  const addOne = async (med: MedicationView) => {
    if (!(await createReminder(med))) showLocalizedAlert(k('consult.rx.reminderFailed'), k('consult.rx.tryAgain'));
  };
  const addAll = async () => {
    const pending = medications.filter((m) => !added.includes(m.id));
    let failed = 0;
    for (const med of pending) if (!(await createReminder(med))) failed += 1;
    if (failed) showLocalizedAlert(k('consult.rx.someFailedTitle'), k('consult.rx.someFailedBody', { n: num(failed), total: num(pending.length) }));
  };

  // Decision 18: "اطلب الأدوية دي". With a saved prescription the checkout opens on it (`prescriptionId`): its lines are
  // ordered and the order carries prescription_id, so the prescription counts as uploaded (#659). Without one, the
  // prescribed catalogue medicines go into the (local) cart as before.
  const orderable = medications.filter((m) => m.medicine_id);
  const orderThese = async () => {
    if (prescription?.id) {
      router.push({ pathname: '/pharmacy/checkout', params: { prescriptionId: String(prescription.id) } } as unknown as Href);
      return;
    }
    setOrdering(true);
    try {
      for (const med of orderable) await addItem({ id: String(med.medicine_id), name: med.name, rx: true });
      // lines the doctor wrote by hand have no catalogue id: say how many were left out instead of skipping them silently
      const left = medications.length - orderable.length;
      if (left > 0) showLocalizedAlert(k('consult.rx.notInCartTitle'), k('consult.rx.notInCartBody', { n: num(left), total: num(medications.length) }));
      router.push('/pharmacy/cart' as Href);
    } finally {
      setOrdering(false);
    }
  };

  const labs = Array.isArray(prescription?.labs) ? prescription.labs : [];
  const fallbackMeds = (fallback ?? []).filter((m) => m.medicine_name);

  if (load.state === 'loading') return null;
  if (load.state === 'error') {
    return (
      <Section title={k('consult.rx.title')}>
        <SectionNote text={k('consult.rx.reminderFailed')} actionLabel={k('consult.retry')} onAction={load.retry} />
      </Section>
    );
  }
  if (!prescription) {
    // The doctor's summary lists the medicines even when there is no active prescription record for this visit.
    if (fallbackMeds.length === 0) return null;
    return (
      <Section title={k('consult.rx.title')}>
        <Card theme={theme}>
          {fallbackMeds.map((med, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: i === fallbackMeds.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
              <FIcon icon="pill" tone={RX_TONE} size={40} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{med.medicine_name}</Text>
                {[med.dose, med.duration].filter(Boolean).length > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[med.dose, med.duration].filter(Boolean).join(' · ')}</Text> : null}
                {med.notes ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{med.notes}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      </Section>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Section title={k('consult.rx.title')}>
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="prescription" tone={RX_TONE} size={48} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {prescription.doctor ? <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{prescription.doctor}</Text> : null}
              {prescription.spec ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{prescription.spec}</Text> : null}
              {prescription.date ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{date(prescription.date)}</Text> : null}
            </View>
          </View>
        </Card>
      </Section>

      <Section title={k('consult.rx.medicines', { n: num(medications.length) })} actionLabel={medications.length > 0 ? k('consult.rx.addAll') : undefined} onAction={() => void addAll()}>
        {medications.map((med) => {
          const done = added.includes(med.id);
          return (
            <Card key={med.id} theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="pill" tone={RX_TONE} size={44} theme={theme} />
                <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{med.name}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <InfoRow label={k('consult.rx.dose')} value={med.dose} />
                <InfoRow label={k('consult.rx.duration')} value={med.duration_days ? k('consult.rx.days', { n: num(med.duration_days) }) : ''} />
                <InfoRow label={k('consult.rx.instructions')} value={med.instruction} last />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <Button label={done ? k('consult.rx.reminderAdded') : k('consult.rx.addReminder')} variant="outline" size="sm" startIcon={done ? 'check-circle' : 'bell'} disabled={done} onPress={() => void addOne(med)} theme={theme} />
                {/* catalog medicines only: a manually written line has no product page */}
                {med.medicine_id ? <Button label={k('consult.rx.details')} variant="ghost" size="sm" startIcon="info" onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { productId: med.medicine_id } } as unknown as Href)} theme={theme} /> : null}
              </View>
            </Card>
          );
        })}
        {orderable.length > 0 ? (
          <Button label={k('consult.rx.orderThese')} size="lg" fullWidth startIcon="package" loading={ordering} onPress={() => void orderThese()} theme={theme} testID="prescription-order-these" />
        ) : prescription.id ? (
          <Button label={k('consult.rx.order')} size="lg" fullWidth startIcon="package" onPress={() => router.push({ pathname: '/pharmacy/rx-order', params: { prescriptionId: String(prescription.id) } } as unknown as Href)} theme={theme} testID="rx-order" />
        ) : null}
      </Section>

      {labs.length > 0 ? (
        <Section title={k('consult.rx.labs', { n: num(labs.length) })}>
          {labs.map((lab, i) => (
            <Card key={lab.id ?? i} theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="test-tube" tone="mint" size={44} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{lab.name}</Text>
                  {lab.instructions ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{lab.instructions}</Text> : null}
                </View>
              </View>
            </Card>
          ))}
          <Button label={k('consult.rx.bookLab')} variant="outline" size="md" fullWidth onPress={() => router.push('/diagnostics/search' as Href)} theme={theme} />
        </Section>
      ) : null}
    </View>
  );
}

/** The patient's own notes and the status history of the appointment, from the appointment record itself. */
export function HistorySection({ notes, history }: { notes?: string; history?: HistoryRow[] }) {
  const { theme, t, c, flow, k } = useScreenUi();
  const { dateTime } = useConsultFormat();
  const rows = Array.isArray(history) ? [...history].reverse() : [];
  if (!notes && rows.length === 0) return null;
  return (
    <View style={{ gap: 16 }}>
      {notes ? <TextBlock title={k('consult.follow.notes')} text={notes} /> : null}
      {rows.length > 0 ? (
        <Section title={k('consult.follow.history')}>
          {rows.map((h, i) => {
            const hs = appointmentStatus(h.state);
            return (
              <Card key={i} theme={theme} padding="sm">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <StatusTag label={k(hs.key)} tone={hs.tone} />
                  {h.at ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary }}>{dateTime(h.at)}</Text> : null}
                </View>
                {h.note ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, marginTop: 6, ...flow }}>{h.note}</Text> : null}
              </Card>
            );
          })}
        </Section>
      ) : null}
    </View>
  );
}

/**
 * The visit's outcomes in one read, GET /care/appointments/:id/outcomes (sick leave and certificates, reports, the lab tests and scans
 * resolved to the catalogue). Once they are on screen the visit is marked seen (PATCH .../outcomes/seen), which clears the hub badge.
 */
export function useVisitOutcomes(appointmentId: string, enabled: boolean): VisitOutcomes | null {
  const load = useSection<VisitOutcomes>(`/care/appointments/${encodeURIComponent(appointmentId)}/outcomes`, Boolean(appointmentId) && enabled, (raw) => {
    const found = readOutcomes(raw);
    return hasOutcomes(found) ? found : null;
  });
  const unseen = load.data?.unseen ?? 0;
  useEffect(() => {
    if (unseen > 0) void markOutcomesSeen(appointmentId);
  }, [appointmentId, unseen]);
  return load.data;
}

/**
 * What the doctor issued besides the prescription (from `useVisitOutcomes`): the sick leave, the medical certificates and the
 * medical reports. A kind the server has no row for is not drawn. Opening one is GET /medical-reports/:id (view-report).
 */
export function OutcomeReportsSection({ outcomes }: { outcomes: VisitOutcomes | null }) {
  const { theme, t, c, flow, k, num, lang } = useScreenUi();
  const { date } = useConsultFormat();
  const data = outcomes && outcomes.sickLeaves.length + outcomes.certificates.length + outcomes.reports.length > 0 ? outcomes : null;
  if (!data) return null;
  const open = (id: string) => router.push({ pathname: '/reports/view-report', params: { id } } as unknown as Href);
  const group = (titleKey: string, icon: 'calendar-dots' | 'file-text', rows: OutcomeReport[], testID: string) =>
    rows.length === 0 ? null : (
      <Section title={k(titleKey)}>
        {rows.map((r) => {
          const title = (lang === 'ar' ? r.title.ar ?? r.title.en : r.title.en ?? r.title.ar) ?? k(titleKey);
          const leave = r.sickLeave;
          const detail = [
            leave?.days != null ? k('consult.outcome.days', { n: num(leave.days) }) : null,
            leave?.start ? date(leave.start) : null,
            leave?.end ? date(leave.end) : null,
            !leave && r.issuedAt ? date(r.issuedAt) : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={title} onPress={() => open(r.id)} testID={`${testID}-${r.id}`} style={{ minHeight: 44 }}>
              <Card theme={theme} padding="sm">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon={icon} tone={RX_TONE} size={44} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
                    {detail ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{detail}</Text> : null}
                  </View>
                  {r.isNew ? <StatusTag label={k('consult.outcome.new')} tone="info" /> : null}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </Section>
    );
  return (
    <View style={{ gap: 16 }} testID="detail-outcome-reports">
      {group('consult.outcome.sickLeave', 'calendar-dots', data.sickLeaves, 'outcome-sick-leave')}
      {group('consult.outcome.certificates', 'file-text', data.certificates, 'outcome-certificate')}
      {group('consult.outcome.reports', 'file-text', data.reports, 'outcome-report')}
    </View>
  );
}

/**
 * The lab tests and scans the doctor requested (`lab_tests` / `radiology_scans` of the outcomes, already resolved by the server).
 * "Book" reads the price of each resolved catalogue row (GET /labs/services/:id, GET /radiology/services/:id) and adds it to the labs
 * and radiology cart; a code the server could not resolve is counted and said, never invented.
 */
export function ReferralsSection({ outcomes }: { outcomes: VisitOutcomes | null }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { addItem } = useDiagnosticsCart();
  const [busy, setBusy] = useState<'lab' | 'radiology' | null>(null);
  if (!outcomes || outcomes.labs.length + outcomes.scans.length === 0) return null;
  const book = async (kind: 'lab' | 'radiology', items: ReferralItem[]) => {
    setBusy(kind);
    let missing = items.filter((i) => !i.resolved).length;
    try {
      for (const item of items) {
        if (!item.resolved) continue;
        try {
          const row = normalizeLabService(recordOf(await apiFetch<unknown>(`/${kind === 'lab' ? 'labs' : 'radiology'}/services/${encodeURIComponent(item.id)}`)));
          if (!row) missing += 1;
          else await addItem({ id: row.id || item.id, name: row.name, price: row.price ?? 0, kind });
        } catch (e) {
          logError('consultations:referral-add', e);
          missing += 1;
        }
      }
      if (missing > 0) showLocalizedAlert(k('consult.outcome.notFoundTitle'), k('consult.outcome.notFoundBody', { n: num(missing), total: num(items.length) }));
      if (missing < items.length) router.push('/diagnostics/cart' as Href);
    } finally {
      setBusy(null);
    }
  };
  const rows: Array<{ kind: 'lab' | 'radiology'; items: ReferralItem[]; titleKey: string; bookKey: string; icon: 'test-tube' | 'scan' }> = [
    { kind: 'lab', items: outcomes.labs, titleKey: 'consult.outcome.labs', bookKey: 'consult.outcome.bookLabs', icon: 'test-tube' },
    { kind: 'radiology', items: outcomes.scans, titleKey: 'consult.outcome.scans', bookKey: 'consult.outcome.bookScans', icon: 'scan' },
  ];
  return (
    <Section title={k('consult.outcome.referrals')}>
      {rows
        .filter((row) => row.items.length > 0)
        .map((row) => (
          <Card key={row.kind} theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon={row.icon} tone="mint" size={44} theme={theme} />
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{k(row.titleKey, { n: num(row.items.length) })}</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <Button label={k(row.bookKey)} variant="outline" size="md" fullWidth startIcon="package" loading={busy === row.kind} disabled={busy !== null} onPress={() => void book(row.kind, row.items)} theme={theme} testID={`referral-book-${row.kind}`} />
            </View>
          </Card>
        ))}
    </Section>
  );
}
