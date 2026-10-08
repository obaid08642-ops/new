import React, { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { EmptyState, Input, Segmented } from '../../../../packages/ui-native/src';
import { Gate, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Pill, Row, bodyOf, useRemote, useTab } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { CareHero, CareScreen, PrimaryAction } from './CareKit';

/**
 * Maternity (board CareHub, merge map section 5): one hub with the tabs Pregnancy and Ovulation (`?tab=`) and the
 * setup form. GET /maternity/profile, POST /maternity/profile. Every figure is an estimate from the dates the reader
 * entered. The baby-growth tab and the fetal-week content have no endpoint the app reads and are not drawn.
 */

export const MATERNITY_HUB = '/maternity/hub' as Href;
export const MATERNITY_SETUP = '/maternity/maternity-setup' as Href;

interface Profile {
  profile_ready?: boolean;
  tracking_mode?: 'pregnancy' | 'cycle' | null;
  is_pregnant?: boolean;
  current_week?: number | null;
  due_date?: string;
  last_period_date?: string;
  cycle_length?: number;
  is_regular?: boolean;
}

const TABS = ['pregnancy', 'ovulation'] as const;
type Tab = (typeof TABS)[number];
const PREGNANCY_WEEKS = 40;

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

/** The ovulation day, the fertile window and the next period from the last period and the recorded cycle length. */
export function cycleEstimate(profile: Profile | null) {
  if (!profile || profile.is_pregnant || !profile.last_period_date || !profile.cycle_length) return null;
  const last = new Date(profile.last_period_date);
  if (Number.isNaN(last.getTime())) return null;
  const ovulation = addDays(last, profile.cycle_length - 14);
  const elapsed = Math.floor((Date.now() - last.getTime()) / 86_400_000) + 1;
  const day = Math.min(profile.cycle_length, Math.max(1, elapsed));
  return { ovulation, start: addDays(ovulation, -5), end: addDays(ovulation, 1), next: addDays(last, profile.cycle_length), length: profile.cycle_length, day };
}

const trimesterKey = (week: number) => (week <= 13 ? 'care.mat.trimester1' : week <= 27 ? 'care.mat.trimester2' : 'care.mat.trimester3');

export function MaternityHubView() {
  const { k, num } = useScreenUi();
  const fmt = useConsultFormat();
  const [tab, setTab] = useTab<Tab>(TABS, 'pregnancy');
  const remote = useRemote(async () => bodyOf<Profile>(await apiFetch('/maternity/profile')), [], 'maternity:profile');
  const profile = remote.data;
  const cycle = cycleEstimate(profile);
  const week = typeof profile?.current_week === 'number' ? profile.current_week : null;

  return (
    <CareScreen title={k('care.mat.title')} testID="maternity-hub">
      <Gate status={remote.status} onRetry={() => void remote.reload()}>
        {!profile?.profile_ready ? (
          <EmptyState icon="baby" tone="pink" title={k('care.mat.profileRequired')} body={k('care.mat.choosePath')} actionLabel={k('care.mat.openSetup')} onAction={() => router.push(MATERNITY_SETUP)} />
        ) : (
          <>
            <HealthTabs
              testID="maternity-tabs"
              tabs={[
                { key: 'pregnancy', label: k('care.mat.tabPregnancy') },
                { key: 'ovulation', label: k('care.mat.tabOvulation') },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'pregnancy' ? (
              profile.is_pregnant ? (
                <CareHero
                  testID="maternity-pregnancy"
                  tone="pink"
                  ring={{ value: week ? week / PREGNANCY_WEEKS : 0, label: week ? k('care.mat.ringLabel', { week: num(week), total: num(PREGNANCY_WEEKS) }) : k('care.mat.currentWeek'), valueText: week ? num(week) : '—', caption: k('care.mat.week') }}
                  title={week ? k(trimesterKey(week)) : k('care.mat.currentWeek')}
                  lines={[k('care.mat.estimatedDueDate') + ': ' + (fmt.date(profile.due_date, true) || '—')]}
                >
                  <Pill label={k('care.mat.estimate')} tone="info" />
                </CareHero>
              ) : (
                <EmptyState icon="baby" tone="pink" title={k('care.mat.noPregnancyTitle')} body={k('care.mat.noPregnancyBody')} actionLabel={k('care.mat.update')} onAction={() => router.push(MATERNITY_SETUP)} />
              )
            ) : cycle ? (
              <>
                <CareHero
                  testID="maternity-ovulation"
                  tone="pink"
                  ring={{ value: cycle.day / cycle.length, label: k('care.mat.dayLabel', { day: num(cycle.day), total: num(cycle.length) }), valueText: num(cycle.day), caption: k('care.mat.dayOfCycle') }}
                  title={k('care.mat.cycle')}
                  lines={[k('care.mat.days', { count: num(cycle.length) }), profile.is_regular ? k('care.mat.regular') : k('care.mat.irregular')]}
                >
                  <Pill label={k('care.mat.estimate')} tone="info" />
                </CareHero>
                <Panel>
                  <Row icon="calendar-dots" tone="pink" title={k('care.mat.estimatedOvulation')} subtitle={fmt.date(cycle.ovulation, true)} />
                  <Row icon="flower-lotus" tone="pink" title={k('care.mat.fertileWindow')} subtitle={`${fmt.date(cycle.start)} — ${fmt.date(cycle.end)}`} />
                  <Row icon="clock-counter-clockwise" tone="pink" title={k('care.mat.nextPeriod')} subtitle={fmt.date(cycle.next, true)} last />
                </Panel>
              </>
            ) : (
              <EmptyState icon="flower-lotus" tone="pink" title={k('care.mat.noCycleTitle')} body={k('care.mat.noCycleBody')} actionLabel={k('care.mat.update')} onAction={() => router.push(MATERNITY_SETUP)} />
            )}
            <Notice tone="warning" text={tab === 'pregnancy' ? k('care.mat.pregnancyNotice') : k('care.mat.cycleNotice')} />
            <Notice tone="info" text={k('care.mat.safetyNotice')} />
            <PrimaryAction variant="outline" label={k('care.mat.update')} onPress={() => router.push(MATERNITY_SETUP)} testID="maternity-update" />
          </>
        )}
      </Gate>
    </CareScreen>
  );
}

type Mode = 'pregnancy' | 'cycle';

export function MaternitySetupView() {
  const { k, theme } = useScreenUi();
  const [mode, setMode] = useState<Mode>('cycle');
  const [lmp, setLmp] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cycleLength, setCycleLength] = useState('');
  const [regular, setRegular] = useState('true');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) {
      setError(k('care.mat.profileRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = mode === 'pregnancy' ? { is_pregnant: true, lmp_date: lmp.trim(), ...(dueDate.trim() ? { due_date: dueDate.trim() } : {}) } : { is_pregnant: false, last_period_date: lmp.trim(), cycle_length: Number(cycleLength), is_regular: regular === 'true' };
      await apiFetch('/maternity/profile', { method: 'POST', body: JSON.stringify(body) });
      router.replace(MATERNITY_HUB);
    } catch (e) {
      logError('maternity:save', e);
      setError(k('care.mat.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CareScreen title={k('care.mat.setup')} testID="maternity-setup" footer={<PrimaryAction label={saving ? k('care.mat.saving') : k('care.mat.save')} loading={saving} onPress={() => void save()} testID="maternity-save" />}>
      <Segmented
        label={k('care.mat.choosePath')}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
        options={[
          { value: 'cycle', label: k('care.mat.cycle') },
          { value: 'pregnancy', label: k('care.mat.pregnancy') },
        ]}
        theme={theme}
      />
      <Notice tone="info" text={mode === 'pregnancy' ? k('care.mat.pregnantSetup') : k('care.mat.cycleSetup')} />
      <View style={{ gap: 12 }}>
        <Input label={k('care.mat.lmp')} value={lmp} onChange={setLmp} hint={k('care.mat.dateFormat')} theme={theme} testID="maternity-lmp" />
        {mode === 'pregnancy' ? (
          <Input label={k('care.mat.dueDate')} value={dueDate} onChange={setDueDate} theme={theme} testID="maternity-due" />
        ) : (
          <>
            <Input label={k('care.mat.cycleLength')} value={cycleLength} onChange={setCycleLength} keyboardType="number" theme={theme} testID="maternity-cycle" />
            <Segmented
              label={k('care.mat.cycleRegularity')}
              value={regular}
              onChange={setRegular}
              options={[
                { value: 'true', label: k('care.mat.regular') },
                { value: 'false', label: k('care.mat.irregular') },
              ]}
              theme={theme}
            />
          </>
        )}
      </View>
      <Notice tone="warning" text={mode === 'pregnancy' ? k('care.mat.pregnancyNotice') : k('care.mat.cycleNotice')} />
      <Notice tone="info" text={k('care.mat.notContraception')} />
      {error ? <Notice tone="danger" text={error} testID="maternity-error" /> : null}
    </CareScreen>
  );
}
