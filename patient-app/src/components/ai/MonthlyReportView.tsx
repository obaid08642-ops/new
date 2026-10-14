import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { EmptyState, SERVICE_ICONS } from '../../../../packages/ui-native/src';
import { CARE_TONE, CONSULT_TONE, RX_TONE, CardAction, Gate, InfoRow, Section, useConsultFormat } from '../consult/ConsultKit';
import { MetricGrid, MetricTile, Panel, Pill, Row, useRemote } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { dateLocaleFor } from '../../utils/dates';
import { pickLocalized } from '../../utils/localize';
import { appointmentStart, parseReportCollection } from '../../utils/monthly-health-report-contract';
import { AiScreen } from './AssistantKit';

/**
 * The monthly report (merge map section 4: it stays a separate screen). Every number is derived from the patient's own data:
 * GET /care/appointments, GET /health/vitals/summary, GET /health/chronic-meds and GET /health/trends. One failed call leaves
 * its block empty; all four failing is the failure state (a response is never turned into an empty report).
 */

const LAB_TONE = SERVICE_ICONS.lab.tone;
const MAP_TONE = SERVICE_ICONS.map.tone;
type Item = Record<string, any>;
const HISTORY = '/health/vitals?tab=trends' as Href;

export function MonthlyReportView() {
  const { k, lang, num, theme } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => {
    const results = await Promise.allSettled([
      apiFetch('/care/appointments').then(parseReportCollection),
      apiFetch('/health/vitals/summary').then(parseReportCollection),
      apiFetch('/health/chronic-meds').then(parseReportCollection),
      apiFetch('/health/trends').then(parseReportCollection),
    ]);
    if (results.every((r) => r.status === 'rejected')) throw new Error('monthly report: every call failed');
    const at = (i: number): Item[] => (results[i].status === 'fulfilled' ? ((results[i] as PromiseFulfilledResult<unknown[]>).value as Item[]) : []);
    return { appointments: at(0), vitals: at(1), meds: at(2), trends: at(3) };
  }, [], 'ai:monthly-report');

  const now = useMemo(() => new Date(), []);
  const monthLabel = new Intl.DateTimeFormat(dateLocaleFor(lang), { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(now);
  const inMonth = (data?.appointments ?? []).filter((a) => {
    const d = appointmentStart(a);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const state = (a: Item) => String(a?.state || a?.status || '').toLowerCase();
  const completed = inMonth.filter((a) => state(a) === 'completed').length;
  const upcoming = inMonth.filter((a) => {
    const d = appointmentStart(a);
    return d && d.getTime() > now.getTime() && state(a) !== 'cancelled';
  }).length;
  const trends = (data?.trends ?? []).filter((t) => t?.data?.length);
  const vitals = data?.vitals ?? [];
  const meds = data?.meds ?? [];
  const hasData = inMonth.length > 0 || vitals.length > 0 || meds.length > 0 || trends.length > 0;

  return (
    <AiScreen title={k('ai.mr.title')} subtitle={monthLabel} onRefresh={() => void reload(true)} testID="monthly-report-screen">
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('ai.mr.error')}>
        {!hasData ? (
          <EmptyState icon="chart-line-up" tone={CARE_TONE} title={k('ai.mr.emptyTitle')} body={k('ai.mr.emptyBody')} actionLabel={k('ai.mr.emptyAction')} onAction={() => router.push('/health/vitals?tab=history' as Href)} theme={theme} />
        ) : (
          <>
            <MetricGrid>
              <MetricTile label={k('ai.mr.appointments')} value={num(inMonth.length)} icon="stethoscope" tone={CONSULT_TONE} />
              <MetricTile label={k('ai.mr.completed')} value={num(completed)} icon="check-circle" tone={LAB_TONE} />
              <MetricTile label={k('ai.mr.upcoming')} value={num(upcoming)} icon="calendar-dots" tone={MAP_TONE} />
              <MetricTile label={k('ai.mr.meds')} value={num(meds.length)} icon="pill" tone={RX_TONE} />
            </MetricGrid>
            {vitals.length > 0 ? (
              <Section title={k('ai.mr.vitals')}>
                <Panel>
                  {vitals.map((v, i) => (
                    <InfoRow key={v.id || v.type || i} label={pickLocalized(v.name_ar, v.name) || String(v.type ?? '')} value={`${v.value ?? v.latest ?? '—'} ${v.unit || ''}`.trim()} last={i === vitals.length - 1} />
                  ))}
                </Panel>
              </Section>
            ) : null}
            {trends.length > 0 ? (
              <Section title={k('ai.mr.trends')}>
                <Panel>
                  {trends.map((t, i) => {
                    const points: unknown[] = t.data;
                    const value = (p: unknown) => Number((p as { value?: unknown })?.value ?? p);
                    const first = value(points[0]);
                    const last = value(points[points.length - 1]);
                    const dir = !isFinite(first) || !isFinite(last) || first === last ? 'stable' : last > first ? 'up' : 'down';
                    return (
                      <Row
                        key={t.id || t.name || i}
                        icon="chart-line-up"
                        tone={CARE_TONE}
                        title={pickLocalized(t.name_ar, t.name) || String(t.id ?? t.name ?? '')}
                        subtitle={k('ai.mr.readings', { n: num(points.length), first: isFinite(first) ? num(first) : '—', last: isFinite(last) ? num(last) : '—', unit: t.unit || '' })}
                        trailing={<Pill label={k(`ai.mr.${dir}`)} tone={dir === 'stable' ? 'success' : 'warning'} />}
                        onPress={() => router.push(HISTORY)}
                        last={i === trends.length - 1}
                      />
                    );
                  })}
                </Panel>
              </Section>
            ) : null}
            {inMonth.length > 0 ? (
              <Section title={k('ai.mr.monthAppointments')}>
                <Panel>
                  {inMonth.map((a, i) => {
                    const done = state(a) === 'completed';
                    return (
                      <Row
                        key={a.id || i}
                        icon="stethoscope"
                        tone={CONSULT_TONE}
                        title={a.doctor?.name || a.doctor_name || a.specialty || k('ai.mr.appointment')}
                        subtitle={fmt.dateTime(appointmentStart(a))}
                        trailing={<Pill label={k(done ? 'ai.mr.done' : 'ai.mr.next')} tone={done ? 'success' : 'info'} />}
                        last={i === inMonth.length - 1}
                      />
                    );
                  })}
                </Panel>
              </Section>
            ) : null}
            <View style={{ gap: 10 }}>
              <CardAction label={k('ai.mr.history')} onPress={() => router.push(HISTORY)} />
              <CardAction label={k('ai.mr.followUp')} tone="outline" onPress={() => router.push('/(tabs)/consultations' as Href)} />
            </View>
          </>
        )}
      </Gate>
    </AiScreen>
  );
}
