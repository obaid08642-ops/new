import React, { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, Chip, EmptyState, Input } from '../../../../packages/ui-native/src';
import { Chevron, Gate, ResultHero, Section, goBack } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Row, bodyOf, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { AccountScreen, SETTINGS_HOME, StarRating } from './AccountKit';

/**
 * Help and support (merge map sections 3 and 8): `?tab=help` has the ways to reach support (the chat, my requests, the support
 * phone from GET /config) and the FAQ (GET /support/faqs, grouped by the category the server sends); `?tab=feedback` sends
 * feedback (POST /support/feedback). /settings/feedback and /settings/support-chat redirect here; /support/chat and
 * /support/ticket stay the flow screens.
 */

const TABS = ['help', 'feedback'] as const;
const KINDS = ['suggestion', 'issue', 'complaint', 'praise', 'question'] as const;

interface Faq { q?: string; question?: string; a?: string; answer?: string; category?: string }

export function HelpView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'help');
  return (
    <AccountScreen title={k('set.help')} testID="help-screen">
      <HealthTabs tabs={TABS.map((key) => ({ key, label: k(`set.help.tab.${key}`) }))} value={tab} onChange={setTab} testID="help-tabs" />
      {tab === 'help' ? <HelpTab /> : <FeedbackTab />}
    </AccountScreen>
  );
}

function HelpTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const faqs = useRemote(async () => rowsOf<Faq>(await apiFetch('/support/faqs')), [], 'settings:faqs');
  const [phone, setPhone] = useState<string | null>(null);
  useRemote(async () => {
    const config = bodyOf<{ contact?: { support_phone?: string } }>(await apiFetch('/config').catch(() => null));
    setPhone(config.contact?.support_phone || null);
    return true;
  }, [], 'settings:support-phone');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const rows = faqs.data ?? [];
  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.category).filter((name): name is string => Boolean(name)))), [rows]);
  const shown = category ? rows.filter((row) => row.category === category) : rows;

  return (
    <>
      <Panel testID="help-contact">
        <Row icon="chat-circle-text" tone="mint" title={k('set.help.chat')} subtitle={k('set.help.chatHint')} onPress={() => router.push('/support/chat' as Href)} testID="help-chat" />
        <Row icon="clipboard-text" tone="blue" title={k('set.help.requests')} subtitle={k('set.help.requestsHint')} onPress={() => router.push('/support/ticket' as Href)} last={!phone} testID="help-requests" />
        {phone ? <Row icon="headset" tone="coral" title={k('set.help.call')} subtitle={phone} onPress={() => void Linking.openURL(`tel:${phone}`).catch(() => undefined)} last testID="help-call" /> : null}
      </Panel>
      <Section title={k('set.help.faq')}>
        <Gate status={faqs.status} onRetry={() => void faqs.reload()}>
          {categories.length > 1 ? (
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label={k('common.all')} selected={category === null} onPress={() => { setCategory(null); setOpen(null); }} theme={theme} />
              {categories.map((name) => (
                <Chip key={name} label={name} selected={category === name} onPress={() => { setCategory(name); setOpen(null); }} theme={theme} />
              ))}
            </View>
          ) : null}
          {shown.length === 0 ? (
            <EmptyState icon="question" tone="blue" title={k('set.help.faqEmpty')} body={k('set.help.faqEmptyBody')} theme={theme} />
          ) : (
            <Card theme={theme} padding="none">
              {shown.map((faq, i) => {
                const expanded = open === i;
                const question = faq.q || faq.question || '';
                return (
                  <View key={`${question}-${i}`} style={{ borderBottomWidth: i === shown.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={question} accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? null : i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, minHeight: 56 }} testID={`faq-${i}`}>
                      <Text style={{ ...scale(t, 'body', 'medium'), color: c.text.primary, flex: 1, ...flow }}>{question}</Text>
                      <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
                        <Chevron />
                      </View>
                    </Pressable>
                    {expanded ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, paddingHorizontal: 14, paddingBottom: 14, ...flow }}>{faq.a || faq.answer || ''}</Text> : null}
                  </View>
                );
              })}
            </Card>
          )}
        </Gate>
      </Section>
    </>
  );
}

/** The stars the form shows become the three ratings the server knows. */
const rateOf = (stars: number): 'positive' | 'neutral' | 'negative' => (stars >= 4 ? 'positive' : stars === 3 ? 'neutral' : 'negative');

function FeedbackTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [stars, setStars] = useState(0);
  const [kind, setKind] = useState<string>('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await apiFetch('/support/feedback', { method: 'POST', body: JSON.stringify({ message: text.trim(), ...(stars ? { rating: rateOf(stars) } : {}), ...(kind ? { category: kind } : {}) }) });
      setSent(true);
    } catch (e) {
      logError('settings:feedback', e);
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={{ gap: 16 }}>
        <ResultHero icon="check-circle" title={k('set.feedback.thanks')} body={k('set.feedback.thanksBody')} />
        <Button label={k('common.back')} size="lg" fullWidth onPress={() => goBack(SETTINGS_HOME)} theme={theme} testID="feedback-done" />
      </View>
    );
  }
  return (
    <>
      <Card theme={theme}>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>{k('set.feedback.rating')}</Text>
          <StarRating value={stars} onChange={setStars} label={k('set.feedback.rating')} testID="feedback-stars" />
        </View>
      </Card>
      <Section title={k('set.feedback.kind')}>
        <View accessibilityRole="radiogroup" accessibilityLabel={k('set.feedback.kind')} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((key) => (
            <Chip key={key} label={k(`set.feedback.kind.${key}`)} selected={kind === key} onPress={() => setKind(kind === key ? '' : key)} theme={theme} testID={`feedback-kind-${key}`} />
          ))}
        </View>
      </Section>
      <Input label={k('set.feedback.message')} placeholder={k('set.feedback.placeholder')} value={text} onChange={setText} multiline rows={5} theme={theme} testID="feedback-message" />
      {failed ? <Notice tone="danger" text={k('set.feedback.failed')} /> : null}
      <Button label={k('set.feedback.send')} size="lg" fullWidth disabled={!text.trim()} loading={sending} onPress={() => void send()} theme={theme} testID="feedback-send" />
    </>
  );
}
