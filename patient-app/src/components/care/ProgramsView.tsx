import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState } from '../../../../packages/ui-native/src';
import { Gate, Sheet } from '../consult/ConsultKit';
import { DoseMark, HealthTabs, Notice, Panel, Pill, Row, rowsOf, useRemote } from '../health/HealthKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { CareBar, CareHero, CareScreen, TEAL_TONE } from './CareKit';

/**
 * The active medical programs (board CareHub, merge map section 8): one tab per program, its progress, the next session,
 * the next reward and the sessions with the one action of marking a session done. GET /medical/programs/active,
 * POST /medical/programs/complete-session (answers the updated list). The texts of a program (title, session titles,
 * dates, reward) are the server's own.
 */

interface Session {
  id: number | string;
  title: string;
  status?: string;
}
interface Program {
  id: string;
  title: string;
  duration?: string;
  completedSessions: number;
  totalSessions: number;
  nextSessionTitle?: string;
  nextSessionDate?: string;
  nextSessionTime?: string;
  milestoneReward?: string;
  rewardDesc?: string;
  sessionsList: Session[];
}

export function ProgramsActiveView() {
  const { k, num } = useScreenUi();
  const remote = useRemote(async () => rowsOf<Program>(await apiFetch('/medical/programs/active')), [], 'programs:active');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [active, setActive] = useState<string>('');
  const [confirm, setConfirm] = useState<Session | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<string | null>(null);
  const { theme } = useScreenUi();

  useEffect(() => {
    if (!remote.data) return;
    setPrograms(remote.data);
    setActive((cur) => (remote.data!.some((p) => p.id === cur) ? cur : remote.data![0]?.id ?? ''));
  }, [remote.data]);

  const selected = programs.find((p) => p.id === active) ?? programs[0];

  const complete = async () => {
    if (!confirm || !selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<Program[]>('/medical/programs/complete-session', { method: 'POST', body: JSON.stringify({ programType: selected.id, sessionId: String(confirm.id) }) });
      if (Array.isArray(res)) setPrograms(res);
      // The milestone is reached when the server's answer shows every session of the programme done,
      // not at a fixed session id (needs-review issue 854).
      const after = Array.isArray(res) ? res.find((p) => p.id === selected.id) : undefined;
      if (after && after.totalSessions > 0 && after.completedSessions >= after.totalSessions && after.milestoneReward) setReward(after.milestoneReward);
      setConfirm(null);
    } catch (e) {
      logError('programs:complete', e);
      setError(k('care.prog.completeFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CareScreen title={k('care.prog.title')} testID="programs-active">
      <Gate status={remote.status} onRetry={() => void remote.reload()}>
        {!selected ? (
          <EmptyState icon="clipboard-text" tone={TEAL_TONE} title={k('care.prog.emptyTitle')} body={k('care.prog.emptyBody')} />
        ) : (
          <>
            <HealthTabs testID="programs-tabs" tabs={programs.map((p) => ({ key: p.id, label: p.title }))} value={selected.id} onChange={setActive} />
            <CareHero
              testID="programs-progress"
              tone={TEAL_TONE}
              ring={{ value: selected.totalSessions ? selected.completedSessions / selected.totalSessions : 0, label: k('care.prog.progressLabel', { done: num(selected.completedSessions), total: num(selected.totalSessions) }), valueText: num(selected.completedSessions), caption: k('care.prog.ofSessions', { total: num(selected.totalSessions) }) }}
              title={selected.title}
              lines={selected.duration ? [`${k('care.prog.duration')}: ${selected.duration}`] : []}
            >
              <CareBar value={selected.totalSessions ? selected.completedSessions / selected.totalSessions : 0} tone={TEAL_TONE} label={k('care.prog.progress')} />
            </CareHero>
            {reward ? <Notice tone="success" text={k('care.prog.congrats', { reward })} testID="programs-reward-won" /> : null}
            <Panel>
              {selected.nextSessionTitle ? <Row icon="calendar-dots" tone={TEAL_TONE} title={k('care.prog.nextSession')} subtitle={selected.nextSessionTitle} caption={[selected.nextSessionDate, selected.nextSessionTime].filter(Boolean).join(' · ') || undefined} last={!selected.milestoneReward} /> : null}
              {selected.milestoneReward ? <Row icon="gift" tone="amber" title={k('care.prog.nextReward')} subtitle={selected.milestoneReward} caption={selected.rewardDesc} last /> : null}
            </Panel>
            <Panel>
              {selected.sessionsList.map((session, i) => {
                const done = session.status === 'completed';
                return (
                  <Row
                    key={String(session.id)}
                    icon="clipboard-text"
                    tone={TEAL_TONE}
                    title={session.title}
                    subtitle={k('care.prog.sessionNo', { n: num(Number(session.id)) })}
                    trailing={done ? <Pill tone="success" label={k('care.prog.done')} /> : <DoseMark taken={false} />}
                    onPress={done ? undefined : () => setConfirm(session)}
                    last={i === selected.sessionsList.length - 1}
                    testID={`programs-session-${session.id}`}
                  />
                );
              })}
            </Panel>
            {error ? <Notice tone="danger" text={error} /> : null}
          </>
        )}
      </Gate>
      <Sheet open={confirm !== null} title={k('care.prog.confirmTitle')} onClose={() => setConfirm(null)} closeLabel={k('consult.close')}>
        <View style={{ gap: 14 }}>
          <Notice tone="info" text={confirm ? `${confirm.title} — ${k('care.prog.confirmBody')}` : ''} />
          <Button label={k('care.prog.confirmYes')} size="lg" fullWidth loading={saving} onPress={() => void complete()} theme={theme} testID="programs-confirm" />
        </View>
      </Sheet>
    </CareScreen>
  );
}
