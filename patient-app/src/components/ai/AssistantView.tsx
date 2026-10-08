import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input } from '../../../../packages/ui-native/src';
import { CardAction, ConsultScreen, goBack, InfoRow, Section } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Pill, Row } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';
import { AI_HOME, AnswerCard, CheckRow, MyBubble } from './AssistantKit';

/**
 * The one assistant (merge map section 4, owner decision 7): three modes in the route (`?mode=symptoms|prescription|report`).
 *  - symptoms: POST /ai/triage { symptoms, red_flags } (the old triage screen and the old assistant chat). The answer is the
 *    server's `care_level`: emergency shows the urgent-help block first, anything else the "book a consultation" button.
 *    No diagnosis, no treatment, no doses.
 *  - prescription: the photo of a prescription or leaflet, POST /ai/ocr-translate { image_base64, target_lang }.
 *  - report: the server refuses automated report interpretation (POST /ai/analyze-report answers "unavailable"), so the mode
 *    sends no request and points to the reports and to a consultation.
 * The conversation is the answers of this visit; the server keeps no history.
 */

const MODES = ['symptoms', 'prescription', 'report'] as const;
type Mode = (typeof MODES)[number];

const FLAGS = [
  ['chest_pain', 'flagChest'], ['breathing_difficulty', 'flagBreathing'], ['fainting_or_unresponsive', 'flagFainting'], ['heavy_bleeding', 'flagBleeding'],
  ['new_confusion', 'flagConfusion'], ['severe_allergic_reaction', 'flagAllergy'], ['severe_injury', 'flagInjury'], ['none', 'flagNone'],
] as const;

const BOOK = '/(tabs)/consultations' as Href;

export function AssistantView() {
  const { k } = useScreenUi();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = (MODES as readonly string[]).includes(String(params.mode)) ? (params.mode as Mode) : 'symptoms';
  return (
    <ConsultScreen title={k('ai.title')} onBack={() => goBack(AI_HOME)} testID="assistant-screen">
      <HealthTabs
        tabs={MODES.map((m) => ({ key: m, label: k(`ai.mode.${m}`) }))}
        value={mode}
        onChange={(next) => router.setParams({ mode: next })}
        testID="assistant-modes"
      />
      {mode === 'symptoms' ? <SymptomsMode /> : null}
      {mode === 'prescription' ? <PrescriptionMode /> : null}
      {mode === 'report' ? <ReportMode /> : null}
    </ConsultScreen>
  );
}

interface Triage { care_level?: string }
interface Turn { id: string; symptoms: string; care_level: string }

function SymptomsMode() {
  const { k } = useScreenUi();
  const [text, setText] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  const toggle = (value: string) =>
    setFlags((current) => {
      if (value === 'none') return current.includes('none') ? [] : ['none'];
      const rest = current.filter((f) => f !== 'none');
      return rest.includes(value) ? rest.filter((f) => f !== value) : [...rest, value];
    });

  const send = async () => {
    const symptoms = text.trim();
    if (!symptoms) { setError(k('ai.symptoms.required')); return; }
    setBusy(true);
    setError(null);
    try {
      const data = (await apiFetch('/ai/triage', { method: 'POST', body: JSON.stringify({ symptoms, red_flags: flags.length ? flags : ['none'] }) })) as Triage;
      setTurns((current) => [...current, { id: String(Date.now()), symptoms, care_level: String(data?.care_level ?? '') }]);
      setText('');
      setFlags([]);
    } catch (e) {
      logError('ai:triage', e);
      setError(k('ai.symptoms.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Notice text={k('ai.symptoms.notice')} />
      {turns.map((turn) => (
        <View key={turn.id} style={{ gap: 10 }} testID={`assistant-turn-${turn.id}`}>
          <MyBubble text={turn.symptoms} />
          <TriageAnswer careLevel={turn.care_level} />
        </View>
      ))}
      <Section title={k('ai.symptoms.question')}>
        <Input value={text} onChange={setText} placeholder={k('ai.symptoms.placeholder')} multiline rows={4} testID="assistant-symptoms" />
      </Section>
      <Section title={k('ai.symptoms.flags')}>
        <View style={{ gap: 8 }}>
          {FLAGS.map(([value, key]) => (
            <CheckRow key={value} label={k(`ai.${key}`)} checked={flags.includes(value)} onPress={() => toggle(value)} testID={`assistant-flag-${value}`} />
          ))}
        </View>
      </Section>
      {error ? <Notice tone="danger" text={error} testID="assistant-error" /> : null}
      <SendButton label={k('ai.symptoms.send')} busy={busy} onPress={() => void send()} />
    </>
  );
}

function SendButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  const { theme } = useScreenUi();
  return <Button label={label} size="lg" fullWidth loading={busy} onPress={onPress} theme={theme} testID="assistant-send" />;
}

/** The server's answer to a triage: a red flag first (urgent help), otherwise the way into a consultation. */
function TriageAnswer({ careLevel }: { careLevel: string }) {
  const { k, t, c, flow } = useScreenUi();
  const emergency = careLevel === 'emergency';
  return (
    <AnswerCard disclaimer={k('ai.disclaimer')} testID={emergency ? 'assistant-emergency' : 'assistant-answer'}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: emergency ? c.status.danger.fg : c.text.primary, ...flow }}>{k(emergency ? 'ai.emergencyTitle' : 'ai.consultationTitle')}</Text>
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k(emergency ? 'ai.emergencyBody' : 'ai.consultationBody')}</Text>
      </View>
      <CardAction label={k('ai.bookConsultation')} tone={emergency ? 'outline' : 'primary'} onPress={() => router.push(BOOK)} testID="assistant-book" />
    </AnswerCard>
  );
}

interface Med { translatedName: string; originalText: string; dosage: string; timing: string; duration: string; notes: string; interactions: string[]; sideEffects: string[]; alternatives: string[]; price: number | null }

function PrescriptionMode() {
  const { k, money } = useScreenUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meds, setMeds] = useState<Med[] | null>(null);

  const translate = async (base64: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = (await apiFetch('/ai/ocr-translate', { method: 'POST', body: JSON.stringify({ image_base64: base64, target_lang: 'ar' }) })) as { ok?: boolean; medications?: Record<string, any>[] } | null;
      if (!res || res.ok === false) throw new Error('ocr-translate failed');
      setMeds((res.medications || []).map((m) => ({
        originalText: m.originalText || m.name_en || m.name || '',
        translatedName: m.translatedName || pickLocalized(m.name_ar, m.name) || m.originalText || m.name_en || m.name || '',
        dosage: m.dosage || '',
        timing: m.frequency || m.instructions || m.timing || '',
        duration: m.duration || '',
        notes: m.instructions || m.notes || '',
        interactions: m.interactions || [],
        sideEffects: m.sideEffects || [],
        alternatives: Array.isArray(m.alternatives) ? m.alternatives : [],
        price: typeof m.price === 'number' && m.price > 0 ? m.price : null,
      })));
    } catch (e) {
      logError('ai:prescription', e);
      setError(k('ai.rx.error'));
    } finally {
      setBusy(false);
    }
  };

  const pick = async (camera: boolean) => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(k('ai.rx.permission')); return; }
      const options = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7, base64: true };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = !result.canceled ? result.assets?.[0] : undefined;
      if (!asset) return;
      if (asset.base64) await translate(asset.base64);
      else setError(k('ai.rx.unreadable'));
    } catch (e) {
      logError('ai:prescription:pick', e);
      setError(k('ai.rx.pickError'));
    }
  };

  return (
    <>
      <Notice text={k('ai.rx.notice')} />
      {error ? <Notice tone="danger" text={error} testID="assistant-error" /> : null}
      <View style={{ gap: 10 }}>
        <CardAction label={busy ? k('ai.rx.reading') : k('ai.rx.camera')} onPress={() => { if (!busy) void pick(true); }} testID="assistant-camera" />
        <CardAction label={k('ai.rx.gallery')} tone="outline" onPress={() => { if (!busy) void pick(false); }} testID="assistant-gallery" />
      </View>
      {meds ? (
        <>
          <Section title={k('ai.rx.medicines', { n: meds.length })}>
            {meds.length === 0 ? <Notice tone="warning" text={k('ai.rx.none')} /> : null}
            {meds.map((m, i) => (
              <AnswerCard key={i} disclaimer={k('ai.disclaimer')} testID={`assistant-med-${i}`}>
                <Row icon="pill" tone="coral" title={m.translatedName} subtitle={m.originalText} last />
                <Panel>
                  {m.timing ? <InfoRow label={k('ai.rx.timing')} value={m.timing} /> : null}
                  {m.duration ? <InfoRow label={k('ai.rx.duration')} value={m.duration} /> : null}
                  {m.dosage ? <InfoRow label={k('ai.rx.dosage')} value={m.dosage} /> : null}
                  {m.notes ? <InfoRow label={k('ai.rx.usage')} value={m.notes} last /> : null}
                </Panel>
                {m.interactions.length > 0 ? <Notice tone="warning" text={`${k('ai.rx.interactions')}: ${m.interactions.join(' • ')}`} /> : null}
                {m.sideEffects.length > 0 ? <ListBlock title={k('ai.rx.sideEffects')} items={m.sideEffects} tone="warning" /> : null}
                {m.alternatives.length > 0 ? <ListBlock title={k('ai.rx.alternatives')} items={m.alternatives} tone="info" /> : null}
                <View style={{ gap: 8 }}>
                  <CardAction label={m.price != null ? k('ai.rx.orderPrice', { price: money(m.price) }) : k('ai.rx.order')} onPress={() => router.push('/(tabs)/pharmacy' as Href)} />
                  <CardAction label={k('ai.rx.details')} tone="outline" onPress={() => router.push({ pathname: '/search', params: { q: m.originalText || m.translatedName, view: 'pharmacy' } } as unknown as Href)} />
                </View>
              </AnswerCard>
            ))}
          </Section>
          <View style={{ gap: 10 }}>
            <CardAction label={k('ai.rx.askPharmacist')} tone="ink" onPress={() => router.push('/pharmacy/pharmacist-chat' as Href)} testID="assistant-pharmacist" />
            <CardAction label={k('ai.rx.reminders')} tone="outline" onPress={() => router.push('/health/medications?tab=reminders&add=1' as Href)} />
            <CardAction label={k('ai.rx.share')} tone="outline" onPress={() => router.push('/consultations/share-report' as Href)} />
          </View>
        </>
      ) : null}
    </>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: 'warning' | 'info' }) {
  const { t, c, flow } = useScreenUi();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...scale(t, 'meta', 'bold'), color: c.text.secondary, ...flow }}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => <Pill key={i} label={String(item)} tone={tone} />)}
      </View>
    </View>
  );
}

function ReportMode() {
  const { k, t, c, flow } = useScreenUi();
  return (
    <>
      <AnswerCard disclaimer={k('ai.disclaimer')} testID="assistant-report">
        <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, ...flow }}>{k('ai.report.title')}</Text>
        <Notice tone="info" text={k('ai.report.body')} />
      </AnswerCard>
      <View style={{ gap: 10 }}>
        <CardAction label={k('ai.report.open')} onPress={() => router.push('/health/records?tab=reports' as Href)} />
        <CardAction label={k('ai.report.share')} tone="outline" onPress={() => router.push('/consultations/share-report' as Href)} />
        <CardAction label={k('ai.bookConsultation')} tone="outline" onPress={() => router.push(BOOK)} />
      </View>
    </>
  );
}
