import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { RX_TONE, Gate, Section, useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { pickLocalized } from '../../utils/localize';
import { HealthScreen, HealthTabs, Panel, Pill, Row, rowsOf, useRemote, useTab } from './HealthKit';

/**
 * Records (board HealthHub "التقارير والنتائج", merge map row "Records"): the tabs Reports, Prescriptions and Timeline.
 * Reports is GET /medical-reports/mine (opens /reports/view-report) and GET /health/reports; Prescriptions is
 * GET /health/prescriptions; Timeline is GET /medical-reports/timeline. The old /health/reports, /health/prescriptions,
 * /reports/hub and /reports/timeline redirect here. Health data is never put in the route.
 */

const TABS = ['reports', 'prescriptions', 'timeline'] as const;

export function RecordsView() {
  const { k, theme } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'reports');
  return (
    <HealthScreen
      title={k('health.records.title')}
      footer={tab === 'prescriptions' ? <Button label={k('health.records.uploadRx')} size="lg" fullWidth startIcon="camera" onPress={() => router.push('/pharmacy/rx-order' as Href)} theme={theme} testID="records-upload-rx" /> : undefined}
      testID="records-screen"
    >
      <HealthTabs tabs={[{ key: 'reports', label: k('health.tab.reports') }, { key: 'prescriptions', label: k('health.tab.prescriptions') }, { key: 'timeline', label: k('health.tab.timeline') }]} value={tab} onChange={setTab} testID="records-tabs" />
      {tab === 'reports' ? <ReportsTab /> : null}
      {tab === 'prescriptions' ? <PrescriptionsTab /> : null}
      {tab === 'timeline' ? <TimelineTab /> : null}
    </HealthScreen>
  );
}

type Kind = 'lab' | 'radiology' | 'notes';
const KIND_LOOK: Record<Kind, { icon: FillIconName; tone: ServiceTone }> = {
  lab: { icon: 'test-tube', tone: 'mint' },
  radiology: { icon: 'scan', tone: 'violet' },
  notes: { icon: 'file-text', tone: 'teal' },
};
const kindOf = (r: { lab_booking_id?: unknown; radiology_booking_id?: unknown }): Kind => (r.lab_booking_id ? 'lab' : r.radiology_booking_id ? 'radiology' : 'notes');

interface MedicalReport { id: string; title_ar?: string; title_en?: string; facility_name?: string; doctor_name?: string; issued_at?: string; createdAt?: string; critical?: boolean; viewed_by_patient?: boolean; lab_booking_id?: string; radiology_booking_id?: string }
interface HealthReport { id: string; date?: string | null; title?: string | null; doctor?: string | null; facility?: string | null; type?: string | null; critical?: boolean; has_attachments?: boolean }

function ReportsTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const mine = useRemote(async () => rowsOf<MedicalReport>(await apiFetch('/medical-reports/mine?limit=100')), [], 'reports:hub');
  const other = useRemote(async () => rowsOf<HealthReport>(await apiFetch('/health/reports')), [], 'health:reports');
  const list = (mine.data ?? []).filter((r) => filter === 'all' || kindOf(r) === filter);
  const nothing = mine.status === 'ready' && other.status === 'ready' && (mine.data ?? []).length === 0 && (other.data ?? []).length === 0;

  return (
    <>
      <HealthTabs tabs={(['all', 'lab', 'radiology', 'notes'] as const).map((key) => ({ key, label: k(`health.records.kind.${key}`) }))} value={filter} onChange={setFilter} testID="report-kinds" />
      <Gate status={mine.status} onRetry={() => void mine.reload()}>
        {nothing ? (
          <EmptyState icon="file-text" tone="teal" title={k('health.records.reportsEmpty')} body={k('health.records.reportsEmptyBody')} theme={theme} />
        ) : list.length > 0 ? (
          <Panel>
            {list.map((r, i) => {
              const kind = kindOf(r);
              return (
                <Row
                  key={r.id}
                  icon={KIND_LOOK[kind].icon}
                  tone={KIND_LOOK[kind].tone}
                  title={pickLocalized(r.title_ar, r.title_en) || k('health.records.report')}
                  subtitle={[r.facility_name || r.doctor_name, fmt.date(r.issued_at || r.createdAt)].filter(Boolean).join(' · ')}
                  trailing={<View style={{ gap: 4 }}>{r.critical ? <Pill label={k('health.records.important')} tone="danger" /> : null}{r.viewed_by_patient === false ? <Pill label={k('health.records.new')} tone="info" /> : null}</View>}
                  onPress={() => router.push({ pathname: '/reports/view-report', params: { id: r.id } } as unknown as Href)}
                  last={i === list.length - 1}
                  testID={`report-${r.id}`}
                />
              );
            })}
          </Panel>
        ) : (mine.data ?? []).length > 0 ? (
          <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.records.noneOfKind')}</Text>
        ) : null}
      </Gate>
      {(other.data ?? []).length > 0 ? (
        <Section title={k('health.records.fromProviders')}>
          <Panel>
            {(other.data ?? []).map((r, i, all) => (
              <Row
                key={r.id}
                icon="file-text"
                tone="teal"
                title={r.title || k('health.records.report')}
                subtitle={[r.type, r.doctor, r.facility, fmt.date(r.date)].filter(Boolean).join(' · ')}
                caption={r.has_attachments ? k('health.records.attachments') : undefined}
                trailing={r.critical ? <Pill label={k('health.records.reportAlert')} tone="warning" /> : undefined}
                last={i === all.length - 1}
              />
            ))}
          </Panel>
        </Section>
      ) : null}
    </>
  );
}

interface Prescription { id: string; doctorName?: string; date?: string; medications?: Array<string | { name?: string; dose?: string }>; isPurchased?: boolean; isOcr?: boolean; ocrAccuracy?: number }

function PrescriptionsTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => rowsOf<Prescription>(await apiFetch('/health/prescriptions')), [], 'health:prescriptions');
  const rows = data ?? [];
  const medName = (m: string | { name?: string; dose?: string }) => (typeof m === 'string' ? m : [m.name, m.dose].filter(Boolean).join(' · '));
  const share = (rx: Prescription) => {
    const meds = (rx.medications ?? []).map((m) => `- ${medName(m)}`).join('\n');
    Share.share({ message: `${k('health.records.rxShareTitle', { doctor: rx.doctorName ?? '' })}\n${fmt.date(rx.date)}\n\n${k('health.records.medicines')}:\n${meds || '—'}` }).catch(() => undefined);
  };
  return (
    <Gate status={status} onRetry={() => void reload()}>
      {rows.length === 0 ? (
        <EmptyState icon="prescription" tone={RX_TONE} title={k('health.records.rxEmpty')} body={k('health.records.rxEmptyBody')} theme={theme} />
      ) : (
        rows.map((rx) => (
          <Card key={rx.id} theme={theme} testID={`rx-${rx.id}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="prescription" tone={RX_TONE} size={44} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{rx.doctorName || k('health.records.rx')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{fmt.date(rx.date)}</Text>
              </View>
              {rx.isPurchased ? <Pill label={k('health.records.purchased')} tone="success" /> : null}
            </View>
            {rx.isOcr && typeof rx.ocrAccuracy === 'number' ? <Pill label={k('health.records.ocr', { n: fmt.num(rx.ocrAccuracy) })} tone="info" /> : null}
            <View style={{ gap: 4 }}>
              {(rx.medications ?? []).map((m, i) => <Text key={i} style={{ ...scale(t, 'small', 'regular'), color: c.text.primary, ...flow }}>{`• ${medName(m)}`}</Text>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {!rx.isPurchased ? <Button label={k('health.records.order')} size="sm" startIcon="package" onPress={() => router.push('/(tabs)/pharmacy' as Href)} theme={theme} /> : null}
              <Button label={k('health.records.share')} size="sm" variant="outline" onPress={() => share(rx)} theme={theme} />
            </View>
          </Card>
        ))
      )}
    </Gate>
  );
}

type EventKind = 'appointment' | 'lab' | 'prescription' | 'vitals';
const EVENT_LOOK: Record<EventKind, { icon: FillIconName; tone: ServiceTone }> = {
  appointment: { icon: 'calendar-dots', tone: 'blue' },
  lab: { icon: 'test-tube', tone: 'mint' },
  prescription: { icon: 'prescription', tone: RX_TONE },
  vitals: { icon: 'heartbeat', tone: 'coral' },
};
interface TimelineEvent { id: string; type?: string; date?: string; time?: string; title?: string; details?: string }

function TimelineTab() {
  const { k, theme } = useScreenUi();
  const [filter, setFilter] = useState<'all' | EventKind>('all');
  const { status, data, reload } = useRemote(async () => rowsOf<TimelineEvent>(await apiFetch('/medical-reports/timeline')), [], 'reports:timeline');
  const events = (data ?? []).filter((e) => filter === 'all' || e.type === filter);
  return (
    <>
      <HealthTabs tabs={(['all', 'appointment', 'lab', 'prescription', 'vitals'] as const).map((key) => ({ key, label: k(`health.records.event.${key}`) }))} value={filter} onChange={setFilter} testID="timeline-kinds" />
      <Gate status={status} onRetry={() => void reload()}>
        {events.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" tone="blue" title={k('health.records.timelineEmpty')} body={k('health.records.timelineEmptyBody')} theme={theme} />
        ) : (
          <Panel>
            {events.map((e, i) => {
              const look = EVENT_LOOK[(e.type as EventKind) in EVENT_LOOK ? (e.type as EventKind) : 'appointment'];
              return <Row key={e.id} icon={look.icon} tone={look.tone} title={e.title ?? ''} subtitle={e.details} caption={[e.date, e.time].filter(Boolean).join(' — ')} last={i === events.length - 1} />;
            })}
          </Panel>
        )}
      </Gate>
    </>
  );
}
