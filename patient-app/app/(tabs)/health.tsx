import React from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card, FIcon, ProgressRing, SERVICE_ICONS, Screen, useTabBarHeight, type ServiceTone } from '../../../packages/ui-native/src';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { CARE_TONE, RX_TONE, Chevron, Gate, Section, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { DoseMark, MetricGrid, MetricTile, Notice, Panel, Pill, Row, rowsOf, useRemote, vitalLook } from '../../src/components/health/HealthKit';
import { apiFetch } from '../../src/utils/api';

/**
 * Health hub (board HealthHub, merge map row "Health hub"): the medical profile card, the vitals grid, today's doses, the
 * health score card (the old /health/score page), the next appointment and the shortcuts to the screens of the merge map.
 * Calls: GET /health/vitals/summary, GET /health/score, GET /home/upcoming-appointment, GET /health/reminders. A section
 * with nothing from the server is not drawn.
 */

interface Summary { key: string; label?: string; value: string; unit?: string; measured_at?: string | null }
interface Score { score?: number | null; status?: string; message?: string; components?: Array<{ key: string; label: string; score: number }>; recommendations?: string[] }
interface Appointment { id?: string; doctorName?: string; type?: string; time?: string }
interface Reminder { id: string; medicine_name_ar?: string; medicine_name_en?: string; dose?: string; times?: string[]; today_doses?: Array<{ time_key: string; status: string }> }

const NUTRITION_TONE = SERVICE_ICONS.nutrition.tone;
const HUB_VITALS = ['bp', 'glucose', 'weight', 'temperature'];
const SCORE_TONE: Record<string, ServiceTone> = { excellent: 'mint', good: 'blue', fair: 'amber', needs_attention: RX_TONE };

export default function HealthHub() {
  const { theme, t, c, dir, flow, k, num } = useScreenUi();
  const fmt = useConsultFormat();
  const barHeight = useTabBarHeight();
  const [refreshing, setRefreshing] = React.useState(false);

  const { status, data, reload } = useRemote(async () => {
    const [vitals, score, appt, reminders] = await Promise.allSettled([
      apiFetch('/health/vitals/summary'),
      apiFetch('/health/score'),
      apiFetch('/home/upcoming-appointment'),
      apiFetch('/health/reminders'),
    ]);
    if ([vitals, score, appt, reminders].every((r) => r.status === 'rejected')) throw new Error('health_hub_unavailable');
    const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
    const apptRaw = ok(appt) as unknown;
    return {
      vitals: rowsOf<Summary>(ok(vitals)),
      score: (ok(score) ?? null) as Score | null,
      appointment: (Array.isArray(apptRaw) ? apptRaw[0] : Array.isArray((apptRaw as { data?: unknown } | null)?.data) ? (apptRaw as { data: Appointment[] }).data[0] : apptRaw) as Appointment | null,
      reminders: rowsOf<Reminder>(ok(reminders)),
      failed: { vitals: vitals.status === 'rejected', score: score.status === 'rejected' },
    };
  }, [], 'health:hub');

  const vitals = (data?.vitals ?? []).filter((v) => HUB_VITALS.includes(v.key));
  const doses = (data?.reminders ?? []).flatMap((r) => (r.today_doses?.length ? r.today_doses : (r.times ?? []).map((time_key) => ({ time_key, status: 'pending' }))).map((d) => ({ d, r }))).sort((a, b) => a.d.time_key.localeCompare(b.d.time_key));
  const score = data?.score;
  const appointment = data?.appointment && (data.appointment.doctorName || data.appointment.id) ? data.appointment : null;

  const go = (href: string) => () => router.push(href as Href);

  return (
    <Screen
      theme={theme}
      direction={dir}
      edges={['top', 'start', 'end']}
      scroll
      bottomSpace={barHeight + 24}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void reload(true).finally(() => setRefreshing(false)); }} tintColor={c.text.primary} />}
      testID="health-hub"
    >
      <View style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h1'), color: c.text.primary, flex: 1, ...flow }}>{k('health.hub.title')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={k('health.hub.idCard')} onPress={go('/reports/passport')} testID="hub-id-card" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.onGlass, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="identification-card" size={20} color={c.icon.primary} />
          </Pressable>
        </View>

        <Card theme={theme} tint="blue">
          <Pressable accessibilityRole="button" accessibilityLabel={k('health.hub.profile')} onPress={go('/health/profile')} testID="hub-profile" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 }}>
            <FIcon icon="identification-card" tone="blue" chip="solid" size={52} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('health.hub.profile')}</Text>
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('health.hub.profileHint')}</Text>
            </View>
            <Chevron />
          </Pressable>
        </Card>

        <Gate status={status} onRetry={() => void reload()}>
          {data?.failed.vitals ? <Notice tone="warning" text={k('health.hub.partial')} /> : null}

          {score ? (
            <Card theme={theme}>
              <Pressable accessibilityRole="button" accessibilityLabel={k('health.hub.scoreOpen')} onPress={go('/health/vitals')} testID="hub-score" style={{ gap: 12 }}>
                {typeof score.score === 'number' ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <ProgressRing value={Math.min(1, Math.max(0, score.score / 100))} tone={SCORE_TONE[String(score.status)] ?? 'blue'} size={88} label={k('health.hub.score')} valueText={num(score.score)} caption="/100" theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('health.hub.score')}</Text>
                        {SCORE_TONE[String(score.status)] ? <Pill label={k(`health.hub.status.${score.status}`)} tone={score.status === 'excellent' ? 'success' : score.status === 'good' ? 'info' : 'warning'} /> : null}
                      </View>
                    </View>
                    {score.components?.length ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {score.components.map((comp) => <Pill key={comp.key} label={`${comp.label} ${num(comp.score)}`} tone="neutral" />)}
                      </View>
                    ) : null}
                    {score.recommendations?.[0] ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{score.recommendations[0]}</Text> : null}
                  </>
                ) : (
                  <View style={{ gap: 4 }}>
                    <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('health.hub.score')}</Text>
                    <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{score.message || k('health.hub.scoreEmpty')}</Text>
                  </View>
                )}
              </Pressable>
            </Card>
          ) : null}

          <Section title={k('health.hub.vitals')} actionLabel={k('health.hub.logReading')} onAction={() => router.push('/health/vitals' as Href)}>
            {vitals.length > 0 ? (
              <MetricGrid>
                {vitals.map((v) => {
                  const look = vitalLook(v.key);
                  return <MetricTile key={v.key} label={look.label ? k(look.label) : String(v.label ?? v.key)} value={String(v.value)} unit={v.unit} caption={v.measured_at ? k('health.vitals.lastAt', { when: fmt.dateTime(v.measured_at) }) : undefined} icon={look.icon} tone={look.tone} onPress={go(`/health/vitals?type=${v.key}`)} testID={`hub-vital-${v.key}`} />;
                })}
              </MetricGrid>
            ) : (
              <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.hub.vitalsEmpty')}</Text>
            )}
          </Section>

          {doses.length > 0 ? (
            <Section title={k('health.hub.doses')} actionLabel={k('health.hub.reminders')} onAction={() => router.push('/health/medications?tab=reminders' as Href)}>
              <Panel>
                {doses.slice(0, 4).map(({ d, r }, i, all) => (
                  <Row
                    key={`${r.id}-${d.time_key}`}
                    icon="pill"
                    tone={RX_TONE}
                    title={[r.medicine_name_ar || r.medicine_name_en, r.dose].filter(Boolean).join(' · ') || k('health.med.medicineUnnamed')}
                    subtitle={fmt.time(d.time_key)}
                    trailing={<DoseMark taken={d.status === 'taken'} />}
                    onPress={go('/health/medications')}
                    last={i === all.length - 1}
                  />
                ))}
              </Panel>
            </Section>
          ) : null}

          {appointment ? (
            <Section title={k('health.hub.appointment')} actionLabel={k('health.hub.all')} onAction={() => router.push('/consultations/appointments' as Href)}>
              <Panel>
                <Row
                  icon="video-camera"
                  tone="violet"
                  title={appointment.doctorName ?? ''}
                  subtitle={[appointment.type, appointment.time].filter(Boolean).join(' · ')}
                  onPress={() => router.push({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: appointment.id || '1' } } as unknown as Href)}
                  last
                  testID="hub-appointment"
                />
              </Panel>
            </Section>
          ) : null}
        </Gate>

        <Panel>
          <Row icon="file-text" tone={CARE_TONE} title={k('health.hub.reports')} subtitle={k('health.hub.reportsHint')} onPress={go('/health/records?tab=reports')} testID="hub-reports" />
          <Row icon="prescription" tone={RX_TONE} title={k('health.hub.prescriptions')} subtitle={k('health.hub.prescriptionsHint')} onPress={go('/health/records?tab=prescriptions')} />
          <Row icon="pill" tone={RX_TONE} title={k('health.hub.medications')} subtitle={k('health.hub.medicationsHint')} onPress={go('/health/medications')} />
          <Row icon="heartbeat" tone={RX_TONE} title={k('health.hub.chronic')} subtitle={k('health.hub.chronicHint')} onPress={go('/health/profile?tab=conditions')} />
          <Row icon="chart-line-up" tone="mint" title={k('health.hub.trends')} subtitle={k('health.hub.trendsHint')} onPress={go('/health/vitals?tab=trends')} />
          <Row icon="moon" tone="violet" title={k('health.hub.sleep')} subtitle={k('health.hub.sleepHint')} onPress={go('/health/sleep')} />
          <Row icon="heart" tone="blue" title={k('health.hub.wearables')} subtitle={k('health.hub.wearablesHint')} onPress={go('/health/wearables')} last />
        </Panel>

        <Panel>
          <Row icon="users-three" tone="peach" title={k('health.hub.family')} subtitle={k('health.hub.familyHint')} onPress={go('/family')} />
          <Row icon="chat-circle-text" tone="blue" title={k('health.hub.familyChat')} subtitle={k('health.hub.familyChatHint')} onPress={go('/family/chat')} />
          <Row icon="first-aid-kit" tone={CARE_TONE} title={k('health.hub.nursing')} subtitle={k('health.hub.nursingHint')} onPress={go('/(tabs)/nursing')} />
          <Row icon="clipboard-text" tone={NUTRITION_TONE} title={k('health.hub.articles')} subtitle={k('health.hub.articlesHint')} onPress={go('/articles')} />
          <Row icon="star" tone="amber" title={k('health.hub.challenges')} subtitle={k('health.hub.challengesHint')} onPress={go('/loyalty/hub')} last />
        </Panel>
      </View>
    </Screen>
  );
}
