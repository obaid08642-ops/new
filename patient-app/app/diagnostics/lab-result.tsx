import React from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, EmptyState, FIcon } from '../../../packages/ui-native/src';
import { Gate, Section, goBack, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { LAB_TONE } from '../../src/components/diagnostics/DiagKit';
import { HealthScreen, Pill, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { RangeBar, Spark } from '../../src/components/ordering/ResultKit';
import { trendFor, type TrendPoint } from '../../src/utils/result-trend';

/** One measured value of the result, as the lab entered it (POST /lab-results); `flag` is the server's (normal, high, low, critical). */
interface Entry { name?: string; value?: string | number; unit?: string; ref_low?: number; ref_high?: number; range?: string; flag?: string }
interface LabResult {
  id?: string; booking_id?: string; service_name_ar?: string; service_name_en?: string; reported_at?: string; reported_by_name?: string;
  critical?: boolean; entries?: Entry[]; findings?: string; impression?: string; recommendations?: string; notes?: string;
  /** A report file the lab uploaded on the booking (the older path): opened from the booking. */
  source?: string; name?: string;
}

const FLAG_TONE: Record<string, 'success' | 'warning' | 'danger'> = { normal: 'success', high: 'warning', low: 'warning', critical: 'danger' };

/**
 * Decision 19 (issue 338): a lab result, opened by its "result ready" push (route /health/results/:id). GET /lab-results/:id
 * answers the patient's own result: each value with its unit, reference range and the server's flag, and what the lab wrote.
 * "Discuss with a doctor" starts the instant consultation with the result attached (/diagnostics/discuss). A report file uploaded on the booking is opened from the booking.
 */
export default function LabResultScreen() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Ord11: the same test's earlier values come from GET /lab-results/mine; a failed history read only hides the trend.
  const { status, data: loaded, reload } = useRemote(async () => {
    if (!id) throw new Error('missing_id');
    const [body, history] = await Promise.all([
      apiFetch(`/lab-results/${encodeURIComponent(String(id))}`).then((raw) => bodyOf<LabResult>(raw)),
      apiFetch('/lab-results/mine').catch(() => null),
    ]);
    return { result: body, history };
  }, [id], 'diagnostics:lab-result');
  const result = loaded?.result;
  const history = loaded?.history;
  const entries = Array.isArray(result?.entries) ? result.entries.filter((e) => e && e.name) : [];
  const title = result ? pickLocalized(result.service_name_ar, result.service_name_en) || result.name || k('diag.result.title') : '';
  const range = (e: Entry) => (e.ref_low !== undefined && e.ref_high !== undefined ? k('diag.result.range', { low: fmt.num(e.ref_low), high: fmt.num(e.ref_high) }) : e.range ? k('diag.result.rangeText', { range: e.range }) : '');
  const text = (label: string, value?: string) => (value ? (
    <Section title={label}>
      <Card theme={theme}>
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{value}</Text>
      </Card>
    </Section>
  ) : null);

  return (
    <HealthScreen title={k('diag.result.title')} onBack={() => goBack('/diagnostics/my-results' as Href)} testID="lab-result-screen">
      <Gate status={status} onRetry={() => void reload()} errorTitle={k('diag.result.error')}>
        {result ? (
          <>
            <Card theme={theme}>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon="file-text" tone={LAB_TONE} size={44} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
                    <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[result.reported_by_name, fmt.date(result.reported_at, true)].filter(Boolean).join(' · ')}</Text>
                    {result.critical ? <Pill label={k('health.report.critical')} tone="danger" /> : null}
                  </View>
                </View>
              </View>
            </Card>
            {entries.length > 0 ? (
              <Card theme={theme}>
                <View>
                  {entries.map((e, i) => {
                    const tone = FLAG_TONE[String(e.flag)];
                    const points: TrendPoint[] = e.name ? trendFor(history, e.name) : [];
                    const current = typeof e.value === 'number' || (typeof e.value === 'string' && e.value.trim() !== '') ? Number(e.value) : NaN;
                    const series = points.length > 0 && Number.isFinite(current) ? [...points.filter((p) => p.id !== result.id).map((p) => p.value), current] : [];
                    const trendLabel = series.length > 1 ? `${k('diag.result.trendTitle')}: ${series.map((v) => fmt.num(v)).join(', ')}` : undefined;
                    return (
                      <View key={`${e.name}-${i}`} accessibilityLabel={[e.name, `${e.value ?? ''} ${e.unit ?? ''}`.trim(), range(e), tone ? k(`diag.result.flag.${e.flag}`) : ''].filter(Boolean).join(', ')} style={{ gap: 8, paddingVertical: 12, borderBottomWidth: i === entries.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                          <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{e.name}</Text>
                          <Text style={{ ...scale(t, 'h4', 'bold'), color: tone ? c.status[tone].fg : c.text.primary }}>{`${e.value ?? ''} ${e.unit ?? ''}`.trim()}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          {tone ? <Pill label={k(`diag.result.flag.${e.flag}`)} tone={tone} /> : <View />}
                          <Spark values={series} flag={e.flag} label={trendLabel} />
                        </View>
                        {Number.isFinite(current) && e.ref_low !== undefined && e.ref_high !== undefined ? <RangeBar value={current} low={e.ref_low} high={e.ref_high} flag={e.flag} /> : null}
                        {range(e) ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{range(e)}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              </Card>
            ) : null}
            {text(k('diag.result.findings'), result.findings)}
            {text(k('diag.result.impression'), result.impression)}
            {text(k('health.report.recommendations'), result.recommendations)}
            {text(k('diag.result.notes'), result.notes)}
            {result.source === 'lab_booking' && result.booking_id ? (
              <Button label={k('diag.result.openBooking')} variant="secondary" onPress={() => router.push({ pathname: '/diagnostics/order/[id]', params: { id: result.booking_id as string } } as unknown as Href)} theme={theme} testID="lab-result-booking" />
            ) : entries.length === 0 && !result.findings && !result.impression ? (
              <EmptyState icon="file-text" tone={LAB_TONE} title={k('health.report.empty')} theme={theme} />
            ) : null}
            {result.source === 'lab_booking' && result.booking_id ? (
              <Button label={k('diag.result.discuss')} onPress={() => router.push({ pathname: '/diagnostics/discuss', params: { booking: result.booking_id as string } } as unknown as Href)} theme={theme} testID="lab-result-discuss" />
            ) : null}
          </>
        ) : null}
      </Gate>
    </HealthScreen>
  );
}
