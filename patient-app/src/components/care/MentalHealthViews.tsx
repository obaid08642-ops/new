import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Input } from '../../../../packages/ui-native/src';
import { Gate, useConsultFormat } from '../consult/ConsultKit';
import { Notice, Panel, Row, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { buildMoodJournalPayload, parseMoodHistory, type MoodEntry, type MoodValue } from '../../utils/mood-journal-contract';
import { CareScreen, ChoiceTile, FormCard, PrimaryAction } from './CareKit';
import type { ServiceTone } from '../../../../packages/ui-native/src';

/**
 * Mental health (board CareHub, merge map section 8): the hub with the links to the mood journal and to consultations,
 * and the mood journal. GET/POST /mental-health/mood. The hub has no urgent-help button because the public system
 * config carries no number for it (never a number written in the app), and no self-assessment, crisis screen or
 * breathing and meditation content: those are removed or not available in the app.
 */

export const MENTAL_HUB = '/mental-health/hub' as Href;
const MOOD_JOURNAL = '/mental-health/mood-journal' as Href;
const CONSULTATIONS = '/(tabs)/consultations' as Href;

export function MentalHealthHubView() {
  const { k } = useScreenUi();
  return (
    <CareScreen title={k('care.mh.title')} testID="mental-hub">
      <Notice tone="info" text={k('care.mh.wellbeingNotice')} />
      <Panel>
        <Row icon="brain" tone="violet" title={k('care.mh.moodJournal')} subtitle={k('care.mh.moodPrompt')} onPress={() => router.push(MOOD_JOURNAL)} testID="mental-mood" />
        <Row icon="stethoscope" tone="blue" title={k('care.mh.consultation')} subtitle={k('care.mh.consultationBody')} onPress={() => router.push(CONSULTATIONS)} last testID="mental-consult" />
      </Panel>
      <Notice tone="warning" text={k('care.mh.noDiagnosis')} />
    </CareScreen>
  );
}

const MOODS: { value: MoodValue; key: string; tone: ServiceTone }[] = [
  { value: 'great', key: 'care.mh.moodGreat', tone: 'mint' },
  { value: 'good', key: 'care.mh.moodGood', tone: 'lime' },
  { value: 'okay', key: 'care.mh.moodOkay', tone: 'amber' },
  { value: 'bad', key: 'care.mh.moodBad', tone: 'peach' },
  { value: 'terrible', key: 'care.mh.moodTerrible', tone: 'coral' },
];
const TAGS = [
  { value: 'calm', key: 'care.mh.tagCalm' },
  { value: 'tired', key: 'care.mh.tagTired' },
  { value: 'stressed', key: 'care.mh.tagStressed' },
  { value: 'connected', key: 'care.mh.tagConnected' },
  { value: 'rested', key: 'care.mh.tagRested' },
  { value: 'overwhelmed', key: 'care.mh.tagOverwhelmed' },
];
const SCALE = [1, 2, 3, 4, 5];

export function MoodJournalView() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const fmt = useConsultFormat();
  const history = useRemote(async () => parseMoodHistory(await apiFetch('/mental-health/mood?days=30')), [], 'mental:mood');
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<number | undefined>();
  const [stress, setStress] = useState<number | undefined>();
  const [sleep, setSleep] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entries: MoodEntry[] = history.data ?? [];

  const submit = async () => {
    if (!mood || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = buildMoodJournalPayload({ mood, energy, stress, sleep, note, tags });
      await apiFetch('/mental-health/mood', { method: 'POST', body: JSON.stringify(payload) });
      setMood(null);
      setTags([]);
      setNote('');
      setEnergy(undefined);
      setStress(undefined);
      setSleep('');
      setSaved(true);
      await history.reload(true);
    } catch (e) {
      logError('mental:mood-save', e);
      setError(k('care.mh.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));
  const scaleRow = (label: string, value: number | undefined, onChange: (n: number) => void) => (
    <View style={{ gap: 8 }}>
      <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 8 }}>
        {SCALE.map((n) => (
          <ChoiceTile key={n} label={num(n)} selected={value === n} tone="violet" onPress={() => onChange(n)} />
        ))}
      </View>
    </View>
  );

  return (
    <CareScreen title={k('care.mh.moodJournal')} testID="mood-journal" footer={<PrimaryAction label={saving ? k('care.mh.saving') : k('care.mh.save')} loading={saving} onPress={() => void submit()} testID="mood-save" />}>
      <FormCard step={1} title={k('care.mh.moodPrompt')}>
        <View accessibilityRole="radiogroup" accessibilityLabel={k('care.mh.moodPrompt')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MOODS.map((m) => (
            <ChoiceTile key={m.value} label={k(m.key)} selected={mood === m.value} tone={m.tone} onPress={() => setMood(m.value)} testID={`mood-${m.value}`} />
          ))}
        </View>
      </FormCard>
      <FormCard step={2} title={k('care.mh.optionalDetails')}>
        {scaleRow(k('care.mh.energy'), energy, setEnergy)}
        {scaleRow(k('care.mh.stress'), stress, setStress)}
        <Input label={k('care.mh.sleep')} placeholder="0–24" value={sleep} onChange={setSleep} keyboardType="decimal" theme={theme} testID="mood-sleep" />
      </FormCard>
      <FormCard step={3} title={k('care.mh.tags')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAGS.map((tag) => (
            <ChoiceTile key={tag.value} label={k(tag.key)} selected={tags.includes(tag.value)} tone="violet" onPress={() => toggleTag(tag.value)} />
          ))}
        </View>
        <Input label={k('care.mh.note')} placeholder={k('care.mh.notePlaceholder')} value={note} onChange={(v) => setNote(v.slice(0, 500))} multiline rows={4} theme={theme} testID="mood-note" />
      </FormCard>
      {error ? <Notice tone="danger" text={error} testID="mood-error" /> : null}
      {saved ? <Notice tone="success" text={k('care.mh.saved')} testID="mood-saved" /> : null}
      <Notice tone="info" text={k('care.mh.noDiagnosis')} />
      <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('care.mh.history')}</Text>
      <Gate status={history.status} onRetry={() => void history.reload()}>
        {entries.length === 0 ? (
          <Notice tone="info" text={k('care.mh.noHistory')} />
        ) : (
          <Panel>
            {entries.map((entry, i) => {
              const option = MOODS.find((m) => m.value === entry.mood) ?? MOODS[2];
              const tagText = (entry.tags ?? []).map((tag) => { const found = TAGS.find((x) => x.value === tag); return found ? k(found.key) : tag; }).join(' · ');
              return (
                <Row
                  key={entry.id || `${entry.logged_at}-${i}`}
                  icon="heart"
                  tone={option.tone}
                  title={k(option.key)}
                  subtitle={k('care.mh.recordLabel', { date: fmt.date(entry.logged_at) })}
                  caption={[entry.notes, tagText].filter(Boolean).join(' · ') || undefined}
                  last={i === entries.length - 1}
                />
              );
            })}
          </Panel>
        )}
      </Gate>
    </CareScreen>
  );
}
