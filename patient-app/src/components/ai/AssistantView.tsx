import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input } from '../../../../packages/ui-native/src';
import { CardAction, ConsultScreen, goBack, InfoRow, RX_TONE, Section } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Pill, Row } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';
import { i18nManager } from '../../i18n/LanguageManager';
import { AI_HOME, AnswerCard, MyBubble } from './AssistantKit';

/**
 * The one assistant (merge map section 4, owner decision 7): three modes in the route (`?mode=symptoms|prescription|report`).
 *  - symptoms: POST /ai/assistant { message, locale } (decision 15, the one assistant). The server answers in the language and
 *    decides the kind: a red flag shows the urgent-help block first (the emergency screen, number from the admin config); a
 *    symptom names the specialty and "book a consultation" opens the doctor list on it; a medicine of our catalogue shows its
 *    leaflet and "ask the pharmacist". Every answer carries the server's disclaimer. No diagnosis, no medicine to take, no dose.
 *  - prescription: the photo of a prescription or leaflet, POST /ai/ocr-translate { image_base64, target_lang }.
 *  - report: there is no automated report interpretation (a report is explained by a doctor), so the mode
 *    sends no request and points to the reports and to a consultation.
 */

const MODES = ['symptoms', 'prescription', 'report'] as const;
type Mode = (typeof MODES)[number];

const BOOK = '/(tabs)/consultations' as Href;
const URGENT_HELP = '/emergency' as Href;
const doctorsFor = (specialty: string | null): Href =>
  (specialty ? `/search?view=doctors&specialty=${encodeURIComponent(specialty)}` : BOOK) as Href;

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

type Kind = 'red_flag' | 'specialty' | 'leaflet' | 'out_of_scope';
const LEAFLET_PARTS = ['indications', 'how_to_use', 'side_effects', 'warnings', 'storage', 'pregnancy'] as const;
/** The answer of POST /ai/assistant as the server wrote it (decision 15); null when the payload is not an answer. */
interface Answer { kind: Kind; text: string; disclaimer: string; specialty: string | null; urgent: boolean; bookable: boolean; askPharmacist: boolean; leaflet: Array<{ part: string; lines: string[] }> }
interface Turn { id: string; asked: string; answer: Answer }

export function parseAnswer(payload: unknown): Answer | null {
  const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const src = (root?.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown> | null;
  const kind = src?.kind;
  if (kind !== 'red_flag' && kind !== 'specialty' && kind !== 'leaflet' && kind !== 'out_of_scope') return null;
  const text = typeof src?.text === 'string' ? src.text.trim() : '';
  const disclaimer = typeof src?.disclaimer === 'string' ? src.disclaimer.trim() : '';
  if (!text || !disclaimer) return null;
  const actions = (Array.isArray(src?.actions) ? src.actions : []).filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === 'object');
  const book = actions.find((a) => a.type === 'book_consultation');
  const specialty = typeof book?.specialty === 'string' && /^[a-z][a-z_]{1,39}$/.test(book.specialty) ? book.specialty : null;
  const leafletSrc = src?.leaflet && typeof src.leaflet === 'object' ? (src.leaflet as Record<string, unknown>) : {};
  const leaflet = LEAFLET_PARTS.flatMap((part) => {
    const v = leafletSrc[part];
    const lines = (Array.isArray(v) ? v : [v]).filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map((l) => l.trim());
    return lines.length ? [{ part, lines }] : [];
  });
  return {
    kind, text, disclaimer, specialty, leaflet,
    urgent: kind === 'red_flag' || actions.some((a) => a.type === 'emergency_call'),
    bookable: Boolean(book) || kind === 'red_flag' || kind === 'out_of_scope',
    askPharmacist: actions.some((a) => a.type === 'ask_pharmacist'),
  };
}

/** The assistant's languages (backend AssistantDto); the app's Filipino is `tl`. */
const assistantLocale = (lang: string) => (lang === 'tl' ? 'fil' : ['ar', 'en', 'ur', 'hi', 'bn', 'fil'].includes(lang) ? lang : 'ar');

function SymptomsMode() {
  const { k } = useScreenUi();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  const send = async () => {
    const asked = text.trim();
    if (!asked) { setError(k('ai.symptoms.required')); return; }
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch('/ai/assistant', { method: 'POST', body: JSON.stringify({ message: asked.slice(0, 1000), locale: assistantLocale(i18nManager.currentLanguage) }) });
      const answer = parseAnswer(data);
      if (!answer) throw new Error('assistant_empty');
      setTurns((current) => [...current, { id: String(Date.now()), asked, answer }]);
      setText('');
    } catch (e) {
      logError('ai:assistant', e);
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
          <MyBubble text={turn.asked} />
          <AssistantAnswer answer={turn.answer} />
        </View>
      ))}
      <Section title={k('ai.symptoms.question')}>
        <Input value={text} onChange={setText} placeholder={k('ai.symptoms.placeholder')} multiline rows={4} testID="assistant-symptoms" />
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

/** One answer of the assistant: urgent help first for a red flag; the doctor list on the named specialty; the leaflet and the pharmacist. */
function AssistantAnswer({ answer }: { answer: Answer }) {
  const { k, t, c, flow } = useScreenUi();
  const title = answer.urgent ? 'ai.emergencyTitle' : answer.kind === 'leaflet' ? 'ai.leafletTitle' : answer.kind === 'out_of_scope' ? 'ai.outOfScopeTitle' : 'ai.consultationTitle';
  return (
    <AnswerCard disclaimer={answer.disclaimer} testID={answer.urgent ? 'assistant-emergency' : 'assistant-answer'}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: answer.urgent ? c.status.danger.fg : c.text.primary, ...flow }}>{k(title)}</Text>
        <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{answer.text}</Text>
      </View>
      {answer.leaflet.map((section) => (
        <View key={section.part} style={{ gap: 4 }}>
          <Text style={{ ...scale(t, 'meta', 'bold'), color: c.text.secondary, ...flow }}>{k(`ai.leaflet.${section.part}`)}</Text>
          {section.lines.map((line, i) => <Text key={i} style={{ ...scale(t, 'small', 'regular'), color: c.text.primary, ...flow }}>{`• ${line}`}</Text>)}
        </View>
      ))}
      {answer.urgent ? <CardAction label={k('emergency.title')} onPress={() => router.push(URGENT_HELP)} testID="assistant-urgent" /> : null}
      {answer.askPharmacist ? <CardAction label={k('ai.rx.askPharmacist')} onPress={() => router.push('/pharmacy/rx-order?via=type' as Href)} testID="assistant-pharmacist" /> : null}
      {answer.bookable ? <CardAction label={k('ai.bookConsultation')} tone={answer.urgent || answer.askPharmacist ? 'outline' : 'primary'} onPress={() => router.push(doctorsFor(answer.specialty))} testID="assistant-book" /> : null}
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
      const res = (await apiFetch('/ai/ocr-translate', { method: 'POST', body: JSON.stringify({ image_base64: base64, target_lang: i18nManager.currentLanguage }) })) as { ok?: boolean; medications?: Record<string, any>[] } | null;
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
                <Row icon="pill" tone={RX_TONE} title={m.translatedName} subtitle={m.originalText} last />
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
            <CardAction label={k('ai.rx.askPharmacist')} tone="ink" onPress={() => router.push('/pharmacy/rx-order?via=type' as Href)} testID="assistant-pharmacist" />
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
