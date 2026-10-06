import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Button, EmptyState, Input, Segmented } from '../../../../packages/ui-native/src';
import { Gate, Section, useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { HealthScreen, HealthTabs, LineChart, MetricGrid, MetricTile, Notice, Panel, Pill, Row, SheetForm, bodyOf, rowsOf, useRemote, useTab, vitalLook } from './HealthKit';

/**
 * Vitals (board HealthHub, merge map row "Vitals"): the tabs Today, History and Trends and the "Add reading" sheet.
 * Today is GET /health/vitals/summary (the last reading of each vital), History is GET /health/vitals?type=&limit=30,
 * Trends is GET /health/trends, and the sheet is POST /health/vitals. Old routes /health/vitals-log and /health/trends
 * redirect here. No value is invented: a vital with no reading is not drawn.
 */

const TABS = ['today', 'history', 'trends'] as const;
const TYPES = ['bp', 'glucose', 'heart_rate', 'weight', 'temperature', 'spo2'] as const;
type VitalType = (typeof TYPES)[number];
const CONTEXTS = ['morning', 'afternoon', 'evening'] as const;

interface Summary { key: string; label?: string; value: string; unit?: string; measured_at?: string | null }
interface Reading { id: string; type?: string; value: string; unit?: string; measured_at?: string; context?: string | null }
interface Trend { id: string; name?: string; unit?: string; data?: Array<{ value: number }>; current?: number; normal?: [number, number] | null; trend?: string; trendDir?: string; insight?: string }

const UNIT: Record<VitalType, string> = { bp: 'mmHg', glucose: 'mg/dL', heart_rate: 'bpm', weight: 'kg', temperature: '°C', spo2: '%' };

export function VitalsView({ initialType }: { initialType?: string }) {
  const { k, theme } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'today');
  const [type, setType] = useState<VitalType>((TYPES as readonly string[]).includes(String(initialType)) ? (initialType as VitalType) : 'bp');
  const [sheet, setSheet] = useState(false);
  const [version, setVersion] = useState(0);

  return (
    <HealthScreen
      title={k('health.vitals.title')}
      footer={<Button label={k('health.vitals.add')} size="lg" fullWidth startIcon="plus" onPress={() => setSheet(true)} theme={theme} testID="vitals-add" />}
      testID="vitals-screen"
    >
      <HealthTabs
        tabs={[{ key: 'today', label: k('health.tab.today') }, { key: 'history', label: k('health.tab.history') }, { key: 'trends', label: k('health.tab.trends') }]}
        value={tab}
        onChange={setTab}
        testID="vitals-tabs"
      />
      {tab === 'today' ? <TodayTab version={version} onOpen={(key) => { setType(key); setTab('history'); }} onAdd={() => setSheet(true)} /> : null}
      {tab === 'history' ? <HistoryTab version={version} type={type} onType={setType} onAdd={() => setSheet(true)} /> : null}
      {tab === 'trends' ? <TrendsTab version={version} onAdd={() => setSheet(true)} /> : null}
      <AddReadingSheet open={sheet} type={type} onType={setType} onClose={() => setSheet(false)} onSaved={() => { setSheet(false); setVersion((v) => v + 1); }} />
    </HealthScreen>
  );
}

function TodayTab({ version, onOpen, onAdd }: { version: number; onOpen: (key: VitalType) => void; onAdd: () => void }) {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => rowsOf<Summary>(await apiFetch('/health/vitals/summary')), [version], 'health:vitals-summary');
  const rows = data ?? [];
  return (
    <Gate status={status} onRetry={() => void reload()}>
      {rows.length === 0 ? (
        <EmptyState icon="heartbeat" tone="coral" title={k('health.vitals.empty')} body={k('health.vitals.emptyBody')} actionLabel={k('health.vitals.add')} onAction={onAdd} theme={theme} />
      ) : (
        <>
          <MetricGrid>
            {rows.map((row) => {
              const look = vitalLook(row.key);
              return (
                <MetricTile
                  key={row.key}
                  label={look.label ? k(look.label) : String(row.label ?? row.key)}
                  value={String(row.value)}
                  unit={row.unit}
                  caption={row.measured_at ? k('health.vitals.lastAt', { when: fmt.dateTime(row.measured_at) }) : undefined}
                  icon={look.icon}
                  tone={look.tone}
                  onPress={(TYPES as readonly string[]).includes(row.key) ? () => onOpen(row.key as VitalType) : undefined}
                  testID={`vital-${row.key}`}
                />
              );
            })}
          </MetricGrid>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('health.vitals.note')}</Text>
        </>
      )}
    </Gate>
  );
}

function HistoryTab({ version, type, onType, onAdd }: { version: number; type: VitalType; onType: (type: VitalType) => void; onAdd: () => void }) {
  const { k, theme } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => rowsOf<Reading>(await apiFetch(`/health/vitals?type=${type}&limit=30`)), [type, version], 'health:vitals-log');
  const rows = data ?? [];
  const look = vitalLook(type);
  return (
    <>
      <HealthTabs
        tabs={TYPES.map((key) => ({ key, label: k(vitalLook(key).label) }))}
        value={type}
        onChange={onType}
        testID="vitals-types"
      />
      <Gate status={status} onRetry={() => void reload()}>
        {rows.length === 0 ? (
          <EmptyState icon={look.icon} tone={look.tone} title={k('health.vitals.emptyType')} body={k('health.vitals.emptyTypeBody')} actionLabel={k('health.vitals.add')} onAction={onAdd} theme={theme} />
        ) : (
          <Section title={k('health.vitals.lastN', { n: fmt.num(rows.length) })}>
            <Panel>
              {rows.map((row, i) => (
                <Row
                  key={row.id}
                  icon={look.icon}
                  tone={look.tone}
                  title={`${row.value} ${row.unit || UNIT[type]}`}
                  subtitle={[fmt.dateTime(row.measured_at), row.context && (CONTEXTS as readonly string[]).includes(row.context) ? k(`health.ctx.${row.context}`) : row.context].filter(Boolean).join(' · ')}
                  last={i === rows.length - 1}
                />
              ))}
            </Panel>
          </Section>
        )}
      </Gate>
    </>
  );
}

function TrendsTab({ version, onAdd }: { version: number; onAdd: () => void }) {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [active, setActive] = useState<string | null>(null);
  const { status, data, reload } = useRemote(async () => rowsOf<Trend>(await apiFetch('/health/trends')), [version], 'health:trends');
  const trends = (data ?? []).filter((v) => Array.isArray(v?.data) && v.data.length > 0);
  const current = trends.find((v) => v.id === active) ?? trends[0];
  const nameOf = (v: Trend) => (vitalLook(v.id).label ? k(vitalLook(v.id).label) : String(v.name ?? v.id));
  const share = () => {
    const lines = trends.map((v) => `• ${nameOf(v)}: ${v.data?.[v.data.length - 1]?.value ?? '—'} ${v.unit ?? ''}`);
    if (lines.length) Share.share({ message: `${k('health.trends.shareTitle')}\n${fmt.date(new Date())}\n\n${lines.join('\n')}` }).catch(() => undefined);
  };
  return (
    <Gate status={status} onRetry={() => void reload()}>
      {!current ? (
        <EmptyState icon="chart-line-up" tone="mint" title={k('health.trends.empty')} body={k('health.trends.emptyBody')} actionLabel={k('health.vitals.add')} onAction={onAdd} theme={theme} />
      ) : (
        <>
          <HealthTabs tabs={trends.map((v) => ({ key: v.id, label: nameOf(v) }))} value={current.id} onChange={setActive} testID="trend-types" />
          <Panel>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Text style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>
                  {String(current.current ?? current.data?.[current.data.length - 1]?.value ?? '')}
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary }}>{` ${current.unit ?? ''}`}</Text>
                </Text>
                {Array.isArray(current.normal) && typeof current.current === 'number' ? (
                  current.current >= current.normal[0] && current.current <= current.normal[1]
                    ? <Pill label={k('health.trends.inRange')} tone="success" />
                    : <Pill label={k('health.trends.outRange')} tone="warning" />
                ) : null}
              </View>
              {Array.isArray(current.normal) ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('health.trends.normal', { lo: fmt.num(current.normal[0]), hi: fmt.num(current.normal[1]), unit: current.unit ?? '' })}</Text> : null}
              <LineChart values={(current.data ?? []).map((d) => d.value)} tone={vitalLook(current.id).tone} label={nameOf(current)} testID="trend-chart" />
              {current.trend ? <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, ...flow }}>{current.trend}</Text> : null}
              {current.insight ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{current.insight}</Text> : null}
            </View>
          </Panel>
          <MetricGrid>
            {(() => {
              const values = (current.data ?? []).map((d) => d.value);
              const unit = current.unit;
              const avg = values.reduce((s, v) => s + v, 0) / values.length;
              return [
                { key: 'max', label: k('health.trends.max'), value: fmt.num(Math.max(...values), { maximumFractionDigits: 1 }), unit },
                { key: 'min', label: k('health.trends.min'), value: fmt.num(Math.min(...values), { maximumFractionDigits: 1 }), unit },
                { key: 'avg', label: k('health.trends.avg'), value: fmt.num(avg, { maximumFractionDigits: 1 }), unit },
                { key: 'count', label: k('health.trends.count'), value: fmt.num(values.length), unit: undefined },
              ].map((m) => <MetricTile key={m.key} label={m.label} value={m.value} unit={m.unit} icon="chart-line-up" tone={vitalLook(current.id).tone} />);
            })()}
          </MetricGrid>
          <Button label={k('health.trends.share')} variant="outline" size="md" fullWidth startIcon="file-text" onPress={share} theme={theme} testID="trends-share" />
        </>
      )}
    </Gate>
  );
}

function AddReadingSheet({ open, type, onType, onClose, onSaved }: { open: boolean; type: VitalType; onType: (type: VitalType) => void; onClose: () => void; onSaved: () => void }) {
  const { k, theme } = useScreenUi();
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [context, setContext] = useState<string>('morning');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bp = type === 'bp';

  const save = async () => {
    if (!primary.trim() || (bp && !secondary.trim())) {
      setError(k('health.vitals.required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { type, context, source: 'manual' };
      if (bp) {
        payload.systolic = Number(primary);
        payload.diastolic = Number(secondary);
      } else payload.value = Number(primary);
      await apiFetch('/health/vitals', { method: 'POST', body: JSON.stringify(payload) });
      setPrimary('');
      setSecondary('');
      onSaved();
    } catch {
      setError(k('health.vitals.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetForm open={open} title={k('health.vitals.addTitle', { name: k(vitalLook(type).label) })} onClose={onClose} onSave={() => void save()} saving={saving} error={error} saveLabel={k('health.vitals.save')} testID="reading-sheet">
      <HealthTabs tabs={TYPES.map((key) => ({ key, label: k(vitalLook(key).label) }))} value={type} onChange={(next) => { onType(next); setError(null); }} />
      {bp ? (
        <View style={{ gap: 12 }}>
          <Input label={k('health.vitals.systolic')} value={primary} onChange={setPrimary} keyboardType="number" theme={theme} />
          <Input label={k('health.vitals.diastolic')} value={secondary} onChange={setSecondary} keyboardType="number" theme={theme} />
        </View>
      ) : (
        <Input label={k('health.vitals.reading', { unit: UNIT[type] })} value={primary} onChange={setPrimary} keyboardType="decimal" theme={theme} />
      )}
      <Segmented label={k('health.vitals.when')} value={context} onChange={setContext} options={CONTEXTS.map((key) => ({ value: key, label: k(`health.ctx.${key}`) }))} theme={theme} />
    </SheetForm>
  );
}
