import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, Input, ProgressRing } from '../../../../packages/ui-native/src';
import { Gate, InfoRow, Section, useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { dateLocaleFor } from '../../utils/dates';
import { apiFetch } from '../../utils/api';
import { HealthScreen, Notice, Panel, Pill, Row, SheetForm, rowsOf, useRemote } from './HealthKit';

/**
 * Sleep (board HealthHub, merge map row "Sleep"): last night's score and hours, the last seven days, the log and the
 * "Add sleep" sheet. One call, GET /health/sleep?limit=30; the sheet is POST /health/sleep. The old /health/sleep-score and
 * /health/sleep-tracker redirect here. Nothing is drawn for a night with no reading.
 */

interface Night { id?: string; measured_at?: string; duration_hours?: number; sleep_score?: number | null; source?: string }

const quality = (score?: number | null): { key: 'excellent' | 'good' | 'fair' | 'poor'; tone: 'success' | 'info' | 'warning' | 'danger' } | null =>
  score == null ? null : score >= 80 ? { key: 'excellent', tone: 'success' } : score >= 60 ? { key: 'good', tone: 'info' } : score >= 40 ? { key: 'fair', tone: 'warning' } : { key: 'poor', tone: 'danger' };

const TIPS = [
  { key: 'health.sleep.tip1', icon: 'moon' },
  { key: 'health.sleep.tip2', icon: 'thermometer' },
  { key: 'health.sleep.tip3', icon: 'bowl-food' },
  { key: 'health.sleep.tip4', icon: 'flower-lotus' },
] as const;

export function SleepView() {
  const { k, theme, t, c, flow, lang } = useScreenUi();
  const fmt = useConsultFormat();
  const [sheet, setSheet] = useState(false);
  const { status, data, reload } = useRemote(async () => rowsOf<Night>(await apiFetch('/health/sleep?limit=30')), [], 'health:sleep');
  const nights = data ?? [];
  const last = nights[0] ?? null;
  const q = quality(last?.sleep_score);

  // The last seven days: the most recent reading of each day.
  const week: Array<{ day: string; hours: number; score: number | null }> = [];
  const seen = new Set<string>();
  for (const n of nights) {
    const d = new Date(String(n.measured_at));
    if (Number.isNaN(d.getTime()) || typeof n.duration_hours !== 'number') continue;
    const key = d.toDateString();
    if (seen.has(key) || (Date.now() - d.getTime()) / 86400000 > 7) continue;
    seen.add(key);
    week.push({ day: d.toLocaleDateString(dateLocaleFor(lang), { weekday: 'short' }), hours: n.duration_hours, score: n.sleep_score ?? null });
  }
  week.reverse();
  const avg = week.length ? week.reduce((s, d) => s + d.hours, 0) / week.length : null;
  const maxHours = Math.max(1, ...week.map((d) => d.hours));

  return (
    <HealthScreen
      title={k('health.sleep.title')}
      onRefresh={() => void reload(true)}
      footer={<Button label={k('health.sleep.add')} size="lg" fullWidth startIcon="plus" onPress={() => setSheet(true)} theme={theme} testID="sleep-add" />}
      testID="sleep-screen"
    >
      <Gate status={status} onRetry={() => void reload()}>
        {!last ? (
          <EmptyState icon="moon" tone="violet" title={k('health.sleep.empty')} body={k('health.sleep.emptyBody')} actionLabel={k('health.sleep.add')} onAction={() => setSheet(true)} theme={theme} />
        ) : (
          <>
            <Card theme={theme} tint="violet">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {last.sleep_score != null ? <ProgressRing value={Math.min(1, Math.max(0, last.sleep_score / 100))} tone="violet" size={104} label={k('health.sleep.score')} valueText={fmt.num(last.sleep_score)} caption="/100" theme={theme} /> : null}
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('health.sleep.lastNight')}</Text>
                  {typeof last.duration_hours === 'number' ? (
                    <Text style={{ ...scale(t, 'h1'), color: c.text.primary, ...flow }}>
                      {fmt.num(last.duration_hours, { maximumFractionDigits: 1 })}
                      <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{` ${k('health.sleep.hours')}`}</Text>
                    </Text>
                  ) : null}
                  {q ? <Pill label={k(`health.sleep.q.${q.key}`)} tone={q.tone} /> : null}
                </View>
              </View>
              <View>
                <InfoRow label={k('health.sleep.date')} value={fmt.date(last.measured_at, true)} />
                <InfoRow label={k('health.sleep.source')} value={last.source === 'device' ? k('health.sleep.device') : k('health.sleep.manual')} last />
              </View>
            </Card>

            {week.length > 0 ? (
              <Section title={k('health.sleep.week')}>
                <Card theme={theme}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
                    {week.map((d, i) => (
                      <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <Text style={{ ...scale(t, 'tag', 'bold'), color: c.text.secondary }}>{fmt.num(d.hours, { maximumFractionDigits: 1 })}</Text>
                        <View accessibilityLabel={`${d.day}: ${fmt.num(d.hours, { maximumFractionDigits: 1 })} ${k('health.sleep.hours')}`} style={{ width: '70%', height: `${Math.max(6, (d.hours / maxHours) * 70)}%`, borderRadius: 6, backgroundColor: c.service.violet.fg }} />
                        <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary }}>{d.day}</Text>
                      </View>
                    ))}
                  </View>
                  {avg != null ? <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('health.sleep.avg', { n: fmt.num(avg, { maximumFractionDigits: 1 }) })}</Text> : null}
                </Card>
              </Section>
            ) : null}

            <Section title={k('health.sleep.log')}>
              <Panel>
                {nights.slice(0, 10).map((n, i, all) => (
                  <Row
                    key={n.id ?? i}
                    icon="moon"
                    tone="violet"
                    title={typeof n.duration_hours === 'number' ? `${fmt.num(n.duration_hours, { maximumFractionDigits: 1 })} ${k('health.sleep.hours')}` : k('health.sleep.noHours')}
                    subtitle={fmt.dateTime(n.measured_at)}
                    trailing={n.sleep_score != null ? <Pill label={fmt.num(n.sleep_score)} tone={quality(n.sleep_score)?.tone ?? 'neutral'} /> : undefined}
                    last={i === all.length - 1}
                  />
                ))}
              </Panel>
            </Section>
          </>
        )}

        <Section title={k('health.sleep.tips')}>
          <Panel>
            {TIPS.map((tip, i) => (
              <Row key={tip.key} icon={tip.icon} tone="violet" title={k(tip.key)} last={i === TIPS.length - 1} />
            ))}
          </Panel>
        </Section>
      </Gate>
      <AddSleepSheet open={sheet} onClose={() => setSheet(false)} onSaved={() => { setSheet(false); void reload(true); }} />
    </HealthScreen>
  );
}

function AddSleepSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { k, theme } = useScreenUi();
  const [hours, setHours] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const h = parseFloat(hours);
    const s = parseInt(score, 10);
    if (Number.isNaN(h) || h <= 0 || h > 24) { setError(k('health.sleep.badHours')); return; }
    if (Number.isNaN(s) || s < 0 || s > 100) { setError(k('health.sleep.badScore')); return; }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/health/sleep', { method: 'POST', body: JSON.stringify({ duration_hours: h, sleep_score: s, source: 'manual' }) });
      setHours('');
      setScore('');
      onSaved();
    } catch {
      setError(k('health.sleep.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetForm open={open} title={k('health.sleep.add')} onClose={onClose} onSave={() => void save()} saving={saving} error={error} saveLabel={k('health.sleep.save')} testID="sleep-sheet">
      <Input label={k('health.sleep.hoursField')} value={hours} onChange={setHours} keyboardType="decimal" theme={theme} />
      <Input label={k('health.sleep.scoreField')} value={score} onChange={setScore} keyboardType="number" theme={theme} />
      <Notice tone="info" text={k('health.sleep.note')} />
    </SheetForm>
  );
}
