import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, Chip, EmptyState, FIcon, Input, ProgressRing, Segmented } from '../../../../packages/ui-native/src';
import { RX_TONE, Gate, InfoRow, Section, useConsultFormat } from '../consult/ConsultKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { refillTrackingParams } from '../../utils/chronic-refill-contract';
import { pickLocalized } from '../../utils/localize';
import {
  cancelMedicationNotifications, cancelMedicationSnoozes, getMedicationNotificationPreferences, medicationDisplayName,
  scheduleMedicationNotifications, setMedicationNotificationPreferences, type MedicationNotificationPreferences,
} from '../../utils/medication-notifications';
import { DoseMark, HealthScreen, HealthTabs, Notice, Panel, Pill, Row, SheetForm, rowsOf, useRemote, useTab } from './HealthKit';

/**
 * Medications (board HealthHub "أدوية اليوم", merge map row "Medications"): the tabs Today's doses, All reminders, Refills and
 * Chronic, and the "Add reminder" sheet (also the edit form). The handlers are the ones of the old screens, unchanged:
 * GET /health/reminders (today and all), POST /health/reminders/:id/log, PATCH /health/reminders/:id, POST/PATCH
 * /health/reminders (the sheet), GET /health/reminders?active=1 and POST /health/reminders/:id/refill (Refills),
 * GET /health/chronic-meds and POST /health/reminders/:id/refill[/snooze|/cancel] (Chronic). Device alerts stay with
 * src/utils/medication-notifications. Old routes redirect here with the tab.
 */

const TABS = ['today', 'reminders', 'refills', 'chronic'] as const;
const TIME_OPTIONS = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';
interface Dose { time_key: string; status: DoseStatus; logged_at?: string | null }
interface Reminder {
  id: string; medicine_name_ar?: string; medicine_name_en?: string; dose: string; dosage_count?: number; dosage_form?: string;
  frequency?: string; instructions_ar?: string | null; chronic?: boolean; active?: boolean; times?: string[]; today_doses?: Dose[];
  duration_days?: number; pills_remaining?: number | null; refill_date?: string | null; time_zone?: string; days_until_refill?: number | null;
  total_days?: number | null; original_qty?: number | null;
}

const currentZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
const dosesOf = (r: Reminder): Dose[] => (r.today_doses?.length ? r.today_doses : (r.times ?? []).map((time_key) => ({ time_key, status: 'pending' as DoseStatus })));
const nameOf = (r: Pick<Reminder, 'medicine_name_ar' | 'medicine_name_en'>, fallback: string) => pickLocalized(r.medicine_name_ar, r.medicine_name_en) || fallback;
const STATUS_TONE: Record<DoseStatus, 'success' | 'info' | 'warning' | 'neutral'> = { taken: 'success', pending: 'info', missed: 'warning', skipped: 'neutral' };

/** The medication words of the six locale files (health.med.*, migrated from the old medications table). */
function useMed() {
  const { k } = useScreenUi();
  return (key: string, vars?: Record<string, string | number>) => k(`health.med.${key}`, vars);
}

export function MedicationsView() {
  const { k, theme } = useScreenUi();
  const t = useMed();
  const params = useLocalSearchParams<{ add?: string; edit?: string }>();
  const [tab, setTab] = useTab(TABS, 'today');
  const [editor, setEditor] = useState<{ open: boolean; id?: string }>({ open: params.add === '1' || typeof params.edit === 'string', id: typeof params.edit === 'string' ? params.edit : undefined });
  const [version, setVersion] = useState(0);
  const [alertStatus, setAlertStatus] = useState<'permission_denied' | 'synced' | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rem = useRemote(async () => rowsOf<Reminder>(await apiFetch('/health/reminders')), [version], 'health:reminders');
  const reminders = rem.data ?? [];
  const reload = () => setVersion((v) => v + 1);

  const logDose = async (reminder: Reminder, dose: Dose, status: 'taken' | 'skipped') => {
    setActionKey(`${reminder.id}-${dose.time_key}-${status}`);
    setError(null);
    try {
      await apiFetch(`/health/reminders/${reminder.id}/log`, { method: 'POST', body: JSON.stringify({ status, time_key: dose.time_key, occurred_at: new Date().toISOString() }) });
      if (status === 'taken') await cancelMedicationSnoozes(reminder.id, dose.time_key);
      reload();
    } catch { setError(t('logError')); } finally { setActionKey(null); }
  };
  const stopReminder = async (id: string) => {
    setActionKey(`stop-${id}`);
    setError(null);
    try {
      await apiFetch(`/health/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) });
      await cancelMedicationNotifications(id);
      reload();
    } catch { setError(t('stopError')); } finally { setActionKey(null); }
  };
  const syncAlerts = async (reminder: Reminder) => {
    setActionKey(`sync-${reminder.id}`);
    setError(null);
    try {
      const preferences = await getMedicationNotificationPreferences(reminder.id);
      const result = await scheduleMedicationNotifications(reminder, { title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(reminder, t('medicineUnnamed')), dose: reminder.dose }), taken: t('takeFromAlert'), snooze: t('snoozeTenMinutes'), permissionDenied: t('alertPermissionDenied') }, preferences);
      setAlertStatus(result.permissionDenied ? 'permission_denied' : 'synced');
    } catch { setError(t('alertSyncError')); } finally { setActionKey(null); }
  };

  const open = (id?: string) => setEditor({ open: true, id });

  return (
    <HealthScreen
      title={t('title')}
      onRefresh={() => reload()}
      footer={<Button label={t('addReminder')} size="lg" fullWidth startIcon="plus" onPress={() => open()} theme={theme} testID="meds-add" />}
      testID="medications-screen"
    >
      <HealthTabs
        tabs={[{ key: 'today', label: k('health.tab.doses') }, { key: 'reminders', label: k('health.tab.reminders') }, { key: 'refills', label: k('health.tab.refills') }, { key: 'chronic', label: k('health.tab.chronic') }]}
        value={tab}
        onChange={setTab}
        testID="meds-tabs"
      />
      {alertStatus === 'permission_denied' ? <Notice tone="warning" text={t('alertPermissionDenied')} /> : null}
      {alertStatus === 'synced' ? <Notice tone="success" text={t('alertSynced')} /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}

      {tab === 'today' || tab === 'reminders' ? (
        <Gate status={rem.status} onRetry={() => reload()}>
          {tab === 'today' ? <TodayTab reminders={reminders} actionKey={actionKey} onLog={logDose} onAdd={() => open()} /> : <RemindersTab reminders={reminders} actionKey={actionKey} onLog={logDose} onStop={stopReminder} onSync={syncAlerts} onEdit={open} onAdd={() => open()} />}
        </Gate>
      ) : null}
      {tab === 'refills' ? <RefillsTab version={version} /> : null}
      {tab === 'chronic' ? <ChronicTab version={version} onAdd={() => open()} /> : null}

      <ReminderSheet
        open={editor.open}
        editId={editor.id}
        onClose={() => setEditor({ open: false })}
        onSaved={(permissionDenied) => { setEditor({ open: false }); setAlertStatus(permissionDenied ? 'permission_denied' : 'synced'); reload(); }}
      />
    </HealthScreen>
  );
}

function TodayTab({ reminders, actionKey, onLog, onAdd }: { reminders: Reminder[]; actionKey: string | null; onLog: (r: Reminder, d: Dose, s: 'taken' | 'skipped') => void; onAdd: () => void }) {
  const { theme, t: tk, c, flow } = useScreenUi();
  const t = useMed();
  const fmt = useConsultFormat();
  const doses = reminders.flatMap((reminder) => dosesOf(reminder).map((dose) => ({ dose, reminder }))).sort((a, b) => a.dose.time_key.localeCompare(b.dose.time_key));
  const taken = doses.filter((d) => d.dose.status === 'taken').length;
  if (reminders.length === 0) {
    return <EmptyState icon="pill" tone={RX_TONE} title={t('noReminders')} body={t('noRemindersHint')} actionLabel={t('addReminder')} onAction={onAdd} theme={theme} />;
  }
  return (
    <>
      <Card theme={theme} tint={RX_TONE}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProgressRing value={doses.length ? taken / doses.length : 0} tone={RX_TONE} size={88} label={t('dosesLogged')} valueText={fmt.num(doses.length ? Math.round((taken / doses.length) * 100) : 0)} caption="%" theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ ...scale(tk, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{t('dailyPlan')}</Text>
            <Text style={{ ...scale(tk, 'small', 'regular'), color: c.text.secondary, ...flow }}>{doses.length ? t('doseProgress', { taken: fmt.num(taken), scheduled: fmt.num(doses.length) }) : t('noDoseToday')}</Text>
          </View>
        </View>
      </Card>
      {doses.length > 0 ? (
        <Section title={t('doseTimeline')} actionLabel={t('viewReminders')} onAction={() => router.setParams({ tab: 'reminders' })}>
          <Panel>
            {doses.map(({ dose, reminder }, i) => {
              const done = dose.status !== 'pending';
              const busy = actionKey === `${reminder.id}-${dose.time_key}-taken`;
              return (
                <Row
                  key={`${reminder.id}-${dose.time_key}`}
                  icon="pill"
                  tone={RX_TONE}
                  title={t('doseOf', { name: nameOf(reminder, t('medicineUnnamed')), dose: reminder.dose })}
                  subtitle={fmt.time(dose.time_key)}
                  trailing={dose.status === 'taken' ? <DoseMark taken /> : done ? <Pill label={t(dose.status)} tone={STATUS_TONE[dose.status]} /> : <TakeBox label={t('takeDose')} busy={busy} onPress={() => onLog(reminder, dose, 'taken')} />}
                  last={i === doses.length - 1}
                />
              );
            })}
          </Panel>
        </Section>
      ) : null}
      <Text style={{ ...scale(tk, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{t('safeReminder')}</Text>
      <Panel>
        <Row icon="prescription" tone="violet" title={t('prescriptions')} subtitle={t('prescriptionsHint')} onPress={() => router.push('/health/records?tab=prescriptions' as Href)} last />
      </Panel>
    </>
  );
}

/** The board's dose checkbox: 30 square, an empty ring until the dose is logged; 44 to touch. */
function TakeBox({ label, busy, onPress }: { label: string; busy?: boolean; onPress: () => void }) {
  const { c } = useScreenUi();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: false, busy }} disabled={busy} onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 30, height: 30, borderRadius: 10, borderWidth: 2, borderColor: c.border.strong, opacity: busy ? 0.5 : 1 }} />
    </Pressable>
  );
}

function RemindersTab({ reminders, actionKey, onLog, onStop, onSync, onEdit, onAdd }: { reminders: Reminder[]; actionKey: string | null; onLog: (r: Reminder, d: Dose, s: 'taken' | 'skipped') => void; onStop: (id: string) => void; onSync: (r: Reminder) => void; onEdit: (id: string) => void; onAdd: () => void }) {
  const { theme, t: tk, c, flow } = useScreenUi();
  const t = useMed();
  const fmt = useConsultFormat();
  if (reminders.length === 0) return <EmptyState icon="bell" tone="violet" title={t('noReminders')} body={t('noRemindersHint')} actionLabel={t('addReminder')} onAction={onAdd} theme={theme} />;
  const freq = (f?: string) => (f === 'daily' ? t('daily') : f === 'weekly' ? t('weekly') : f === 'as_needed' ? t('asNeeded') : String(f ?? '').slice(0, 30));
  return (
    <>
      {reminders.map((reminder) => (
        <Card key={reminder.id} theme={theme} testID={`reminder-${reminder.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="pill" tone={RX_TONE} size={44} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(tk, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{nameOf(reminder, t('medicineUnnamed'))}</Text>
              <Text style={{ ...scale(tk, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[reminder.dose, reminder.dosage_count != null ? `${fmt.num(reminder.dosage_count)} ${t('unitsPerDose')}` : '', freq(reminder.frequency)].filter(Boolean).join(' · ')}</Text>
              {reminder.instructions_ar ? <Text style={{ ...scale(tk, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{reminder.instructions_ar}</Text> : null}
            </View>
            {reminder.chronic ? <Pill label={t('chronicMedication')} tone="warning" /> : null}
          </View>
          <View>
            {dosesOf(reminder).map((dose) => (
              <View key={dose.time_key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border.hairline, flexWrap: 'wrap' }}>
                <Text style={{ ...scale(tk, 'small', 'bold'), color: c.text.primary, flex: 1, minWidth: 80, ...flow }}>{t('doseTime', { time: fmt.time(dose.time_key) })}</Text>
                {dose.status === 'pending' ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Button label={t('takeDose')} size="sm" loading={actionKey === `${reminder.id}-${dose.time_key}-taken`} onPress={() => onLog(reminder, dose, 'taken')} theme={theme} />
                    <Button label={t('skipDose')} size="sm" variant="outline" loading={actionKey === `${reminder.id}-${dose.time_key}-skipped`} onPress={() => onLog(reminder, dose, 'skipped')} theme={theme} />
                  </View>
                ) : (
                  <Pill label={t(dose.status)} tone={STATUS_TONE[dose.status]} />
                )}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label={t('edit')} size="sm" variant="outline" onPress={() => onEdit(reminder.id)} theme={theme} />
            <Button label={t('syncAlerts')} size="sm" variant="outline" loading={actionKey === `sync-${reminder.id}`} onPress={() => onSync(reminder)} theme={theme} />
            <Button label={t('stopReminder')} size="sm" variant="ghost" loading={actionKey === `stop-${reminder.id}`} onPress={() => onStop(reminder.id)} theme={theme} />
          </View>
        </Card>
      ))}
    </>
  );
}

/** Refills: the active chronic reminders with the days left, and "order again" (the pharmacy broadcast of POST /health/reminders/:id/refill). */
function RefillsTab({ version }: { version: number }) {
  const { k, theme, t: tk, c, flow } = useScreenUi();
  const t = useMed();
  const fmt = useConsultFormat();
  const [busy, setBusy] = useState<string | null>(null);
  const { status, data, reload } = useRemote(async () => rowsOf<Reminder>(await apiFetch('/health/reminders?active=1')).filter((r) => r.chronic), [version], 'health:refills');
  const items = data ?? [];

  const reorder = (item: Reminder) => {
    const name = nameOf(item, t('medicineUnnamed'));
    showLocalizedAlert(k('health.refill.confirmTitle'), k('health.refill.confirmBody', { name }), [
      { text: k('health.refill.cancel'), style: 'cancel' },
      {
        text: k('health.refill.confirm'),
        onPress: async () => {
          setBusy(item.id);
          try {
            const res = await apiFetch(`/health/reminders/${item.id}/refill`, { method: 'POST' });
            setBusy(null);
            const tracking = refillTrackingParams(res);
            if (tracking) {
              void reload(true);
              showLocalizedAlert(k('health.refill.sentTitle'), k('health.refill.sentBody'), [
                { text: k('health.refill.track'), onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking } as unknown as Href) },
                { text: k('consult.ok'), style: 'cancel' },
              ]);
            } else showLocalizedAlert(k('health.refill.failedTitle'), k('health.refill.failedBody'));
          } catch (e) {
            setBusy(null);
            if (String((e as { message?: string })?.message ?? '').includes('no_default_address')) {
              showLocalizedAlert(k('health.refill.addressTitle'), k('health.refill.addressBody'), [
                { text: k('health.refill.addAddress'), onPress: () => router.push('/profile/addresses' as Href) },
                { text: k('health.refill.cancel'), style: 'cancel' },
              ]);
            } else showLocalizedAlert(k('health.refill.failedTitle'), k('health.refill.networkBody'));
          }
        },
      },
    ]);
  };

  return (
    <Gate status={status} onRetry={() => void reload()}>
      <Notice tone="info" text={k('health.refill.note')} />
      {items.length === 0 ? (
        <EmptyState icon="pill" tone={RX_TONE} title={k('health.refill.empty')} body={k('health.refill.emptyBody')} theme={theme} />
      ) : (
        items.map((item) => {
          const left = item.refill_date ? Math.max(0, Math.ceil((new Date(item.refill_date).getTime() - Date.now()) / 86400000)) : item.days_until_refill ?? null;
          const critical = left != null && left <= 7;
          const pct = left != null && item.total_days ? Math.min(100, (left / item.total_days) * 100) : null;
          return (
            <Card key={item.id} theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="pill" tone={RX_TONE} size={44} theme={theme} />
                <Text style={{ ...scale(tk, 'bodyStrong', 'bold'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{nameOf(item, t('medicineUnnamed'))}</Text>
                {left != null ? <Pill label={critical ? k('health.refill.critical', { n: fmt.num(left) }) : t('daysLeft', { days: fmt.num(left) })} tone={critical ? 'danger' : 'success'} /> : null}
              </View>
              {pct != null ? (
                <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={{ height: 10, borderRadius: 5, backgroundColor: c.border.hairline, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, borderRadius: 5, backgroundColor: critical ? c.status.danger.fg : c.status.success.fg }} />
                </View>
              ) : null}
              {item.pills_remaining != null || item.original_qty != null ? (
                <View>
                  <InfoRow label={t('remainingRecorded')} value={item.pills_remaining != null ? t('unitsLeft', { count: fmt.num(item.pills_remaining) }) : ''} />
                  <InfoRow label={k('health.refill.fullPack')} value={item.original_qty != null ? t('unitsLeft', { count: fmt.num(item.original_qty) }) : ''} last />
                </View>
              ) : null}
              <Text style={{ ...scale(tk, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('health.refill.priceNote')}</Text>
              <Button label={k('health.refill.now')} variant={critical ? 'primary' : 'outline'} size="md" fullWidth loading={busy === item.id} onPress={() => reorder(item)} theme={theme} testID={`refill-${item.id}`} />
            </Card>
          );
        })
      )}
    </Gate>
  );
}

interface ChronicMed { id: string; name?: string; dose?: string; frequency?: string; pills_remaining?: number | null; refill_date?: string | null; days_until_refill?: number | null; needs_refill_soon?: boolean; refill_lead_days?: 2 | 3 }

function ChronicTab({ version, onAdd }: { version: number; onAdd: () => void }) {
  const { theme, t: tk, c, flow } = useScreenUi();
  const t = useMed();
  const fmt = useConsultFormat();
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, data, reload } = useRemote(async () => {
    const rows = rowsOf<ChronicMed>(await apiFetch('/health/chronic-meds'));
    return Promise.all(rows.map(async (item) => {
      const preferences: MedicationNotificationPreferences = await getMedicationNotificationPreferences(item.id);
      const lead: 2 | 3 = preferences.refill_lead_days === 2 ? 2 : 3;
      return { ...item, refill_lead_days: lead, needs_refill_soon: item.days_until_refill == null ? Boolean(item.needs_refill_soon) : item.days_until_refill <= lead };
    }));
  }, [version], 'health:chronic-meds');
  const items = data ?? [];

  const run = async (id: string, kind: 'refill' | 'snooze' | 'cancel') => {
    setAction(`${kind}-${id}`);
    setError(null);
    try {
      const suffix = kind === 'refill' ? '/refill' : kind === 'snooze' ? '/refill/snooze' : '/refill/cancel';
      const response = await apiFetch<{ order_id?: string } | null>(`/health/reminders/${id}${suffix}`, { method: 'POST', body: kind === 'snooze' ? JSON.stringify({ days: 3 }) : undefined });
      if (kind === 'refill' && response?.order_id) { router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: response.order_id } } as unknown as Href); return; }
      await reload(true);
    } catch { setError(kind === 'refill' ? t('refillError') : t('refillUpdateError')); } finally { setAction(null); }
  };

  return (
    <Gate status={status} onRetry={() => void reload()}>
      <Notice tone="info" text={t('chronicNotice')} />
      {error ? <Notice tone="danger" text={error} /> : null}
      {items.length === 0 ? (
        <EmptyState icon="heartbeat" tone={RX_TONE} title={t('noChronic')} body={t('noChronicHint')} actionLabel={t('addReminder')} onAction={onAdd} theme={theme} />
      ) : (
        items.map((item) => {
          const frequency = item.frequency === 'daily' ? t('daily') : item.frequency === 'weekly' ? t('weekly') : t('asNeeded');
          return (
            <Card key={item.id} theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="pill" tone={item.needs_refill_soon ? 'amber' : RX_TONE} size={44} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(tk, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{item.name || t('medicineUnnamed')}</Text>
                  <Text style={{ ...scale(tk, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{t('doseOf', { name: item.dose || t('doseUnrecorded'), dose: frequency })}</Text>
                </View>
                <Pill label={t('chronicMedication')} tone="warning" />
              </View>
              <View>
                {item.refill_date ? (
                  <>
                    <InfoRow label={item.needs_refill_soon ? t('refillSoon') : t('refillFollowup')} value={item.days_until_refill == null ? String(item.refill_date).slice(0, 10) : t('daysLeft', { days: fmt.num(item.days_until_refill) })} strong={item.needs_refill_soon} />
                    <InfoRow label={t('refillLeadDays')} value={item.refill_lead_days === 2 ? t('twoDays') : t('threeDays')} last />
                  </>
                ) : item.pills_remaining != null ? (
                  <InfoRow label={t('remainingRecorded')} value={t('unitsLeft', { count: fmt.num(item.pills_remaining) })} last />
                ) : (
                  <Text style={{ ...scale(tk, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{t('noInventory')}</Text>
                )}
              </View>
              {item.needs_refill_soon ? <Button label={t('startRefill')} size="md" fullWidth startIcon="package" loading={action === `refill-${item.id}`} onPress={() => void run(item.id, 'refill')} theme={theme} /> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button label={t('deferThreeDays')} size="sm" variant="outline" loading={action === `snooze-${item.id}`} onPress={() => void run(item.id, 'snooze')} theme={theme} />
                <Button label={t('stopRefillTracking')} size="sm" variant="ghost" loading={action === `cancel-${item.id}`} onPress={() => void run(item.id, 'cancel')} theme={theme} />
              </View>
            </Card>
          );
        })
      )}
    </Gate>
  );
}

/** The "Add reminder" sheet, also the edit form (`editId`): the old form's fields, validation and save, then the device alerts. */
function ReminderSheet({ open, editId, onClose, onSaved }: { open: boolean; editId?: string; onClose: () => void; onSaved: (permissionDenied: boolean) => void }) {
  const { theme } = useScreenUi();
  const t = useMed();
  const editing = Boolean(editId);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [count, setCount] = useState('1');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [frequency, setFrequency] = useState('daily');
  const [duration, setDuration] = useState('30');
  const [chronic, setChronic] = useState(false);
  const [pillsRemaining, setPillsRemaining] = useState('');
  const [refillDate, setRefillDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeZone, setTimeZone] = useState(currentZone());
  const [important, setImportant] = useState(false);
  const [refillLeadDays, setRefillLeadDays] = useState<2 | 3>(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !editId) return;
    let live = true;
    (async () => {
      try {
        const rows = rowsOf<Reminder>(await apiFetch('/health/reminders'));
        const item = rows.find((row) => row.id === editId);
        if (!item || !live) throw new Error('not_found');
        setName(item.medicine_name_ar || item.medicine_name_en || '');
        setDose(item.dose || '');
        setCount(String(item.dosage_count ?? 1));
        setTimes(item.times?.length ? item.times : ['08:00']);
        setFrequency(item.frequency || 'daily');
        setDuration(String(item.duration_days ?? 30));
        setChronic(Boolean(item.chronic));
        setInstructions(item.instructions_ar || '');
        setPillsRemaining(item.pills_remaining == null ? '' : String(item.pills_remaining));
        setRefillDate(item.refill_date ? String(item.refill_date).slice(0, 10) : '');
        setTimeZone(item.time_zone || currentZone());
        const preferences = await getMedicationNotificationPreferences(item.id);
        if (live) { setImportant(Boolean(preferences.important)); setRefillLeadDays(preferences.refill_lead_days === 2 ? 2 : 3); }
      } catch { if (live) setError(t('saveError')); }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId]);

  const toggleTime = (time: string) => setTimes((cur) => (cur.includes(time) ? cur.filter((x) => x !== time) : [...cur, time].sort()));

  const save = async () => {
    const dosage_count = Number(count);
    const duration_days = chronic ? 0 : Number(duration);
    const pills_remaining = pillsRemaining.trim() ? Number(pillsRemaining) : undefined;
    if (!name.trim() || !dose.trim() || !times.length) { setError(t('formRequired')); return; }
    if (!Number.isFinite(dosage_count) || dosage_count <= 0 || !Number.isInteger(duration_days) || duration_days < 0 || (pills_remaining !== undefined && (!Number.isInteger(pills_remaining) || pills_remaining < 0))) { setError(t('formInvalid')); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { medicine_name_ar: name.trim(), dose: dose.trim(), dosage_count, times, time_zone: timeZone.trim(), frequency, duration_days, chronic, pills_remaining, refill_date: refillDate.trim() || undefined, instructions_ar: instructions.trim() || undefined };
      const response = await apiFetch<Reminder & { data?: Reminder }>(editing ? `/health/reminders/${editId}` : '/health/reminders', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      const saved: Reminder = response?.data || response;
      const reminderId = saved?.id || editId;
      if (!reminderId) throw new Error('missing_reminder_id');
      const preferences = await setMedicationNotificationPreferences(reminderId, { important, refill_lead_days: refillLeadDays });
      const result = await scheduleMedicationNotifications(
        { id: reminderId, medicine_name_ar: saved.medicine_name_ar || name.trim(), medicine_name_en: saved.medicine_name_en, dose: saved.dose || dose.trim(), times: saved.times || times, frequency: saved.frequency || frequency, active: saved.active !== false },
        { title: t('notificationTitle'), body: t('notificationBody', { name: medicationDisplayName(saved, name.trim()), dose: saved.dose || dose.trim() }), taken: t('takeFromAlert'), snooze: t('snoozeTenMinutes'), permissionDenied: t('alertPermissionDenied') },
        preferences,
      );
      onSaved(result.permissionDenied);
    } catch { setError(t('saveError')); } finally { setSaving(false); }
  };

  return (
    <SheetForm open={open} title={editing ? t('editTitle') : t('addTitle')} onClose={onClose} onSave={() => void save()} saving={saving} error={error} saveLabel={editing ? t('saveChanges') : t('saveReminder')} testID="reminder-sheet">
      <Input label={t('medicationName')} value={name} onChange={setName} theme={theme} />
      <Input label={t('dosePlaceholder')} value={dose} onChange={setDose} theme={theme} />
      <Input label={t('unitsPerDose')} value={count} onChange={setCount} keyboardType="number" theme={theme} />
      <Notice tone="info" text={t('doseSafety')} />
      <ChipGroup title={t('schedule')}>
        {TIME_OPTIONS.map((time) => <Chip key={time} label={time} selected={times.includes(time)} onPress={() => toggleTime(time)} theme={theme} />)}
      </ChipGroup>
      <Input label={t('timeZone')} value={timeZone} onChange={setTimeZone} hint={t('timeZoneHint')} theme={theme} />
      <Segmented label={t('frequencyAndDuration')} value={frequency} onChange={setFrequency} options={[{ value: 'daily', label: t('daily') }, { value: 'weekly', label: t('weekly') }, { value: 'as_needed', label: t('asNeeded') }]} theme={theme} />
      <Segmented label={t('chronicMedication')} value={chronic ? 'chronic' : 'limited'} onChange={(v) => setChronic(v === 'chronic')} options={[{ value: 'limited', label: t('limitedDuration') }, { value: 'chronic', label: t('chronicMedication') }]} theme={theme} />
      {!chronic ? <Input label={t('durationDays')} value={duration} onChange={setDuration} keyboardType="number" theme={theme} /> : null}
      <Segmented label={t('deviceAlerts')} value={important ? 'important' : 'normal'} onChange={(v) => setImportant(v === 'important')} options={[{ value: 'normal', label: t('normalAlert') }, { value: 'important', label: t('importantAlert') }]} theme={theme} />
      {chronic ? (
        <>
          <Input label={t('remainingUnits')} value={pillsRemaining} onChange={setPillsRemaining} keyboardType="number" theme={theme} />
          <Input label={t('refillDate')} value={refillDate} onChange={setRefillDate} theme={theme} />
          <Segmented label={t('refillLeadDays')} value={String(refillLeadDays)} onChange={(v) => setRefillLeadDays(v === '2' ? 2 : 3)} options={[{ value: '2', label: t('twoDays') }, { value: '3', label: t('threeDays') }]} theme={theme} />
          <Notice tone="info" text={t('refillHint')} />
        </>
      ) : null}
      <Input label={t('instructions')} value={instructions} onChange={setInstructions} multiline hint={t('instructionsHint')} theme={theme} />
    </SheetForm>
  );
}

function ChipGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { t: tk, c, flow } = useScreenUi();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...scale(tk, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}
