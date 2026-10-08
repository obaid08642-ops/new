import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Card } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { ConsultScreen, Gate, ResultHero, CardAction, useConsultFormat, type GateStatus } from '../consult/ConsultKit';
import { BASE_URL } from '../../utils/api';

/**
 * The legal and notice template (Batch 13, board Settings: header, section cards on the surface). The terms and the privacy
 * policy are reachable before sign-in, so their back button never depends on a history: with none, it goes to the sign-in.
 * The text is the policy the legal service answers for the language; nothing of it is written in the app.
 */

export type PolicyKey = 'patient_terms' | 'privacy_policy';
export interface Policy {
  content: string;
  version?: string | number | null;
  effective_date?: string | null;
}
export type LegalBlock = { kind: 'heading' | 'paragraph' | 'bullet'; text: string };

/** The policy text as blocks: blank lines split paragraphs, `•`, `-` and `*` lead bullets, `#` leads a heading. */
export function parseLegal(content: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (/^#{1,6}\s+/.test(line)) {
      flush();
      blocks.push({ kind: 'heading', text: line.replace(/^#{1,6}\s+/, '') });
    } else if (/^[•\-*]\s+/.test(line)) {
      flush();
      blocks.push({ kind: 'bullet', text: line.replace(/^[•\-*]\s+/, '') });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Back from a screen that may be the first one opened (signed out): the history, else the sign-in. */
export function legalBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(auth)/login' as Href);
}

export function LegalDocument({ policyKey, title, testID }: { policyKey: PolicyKey; title: string; testID?: string }) {
  const { theme, t, c, flow, lang, k } = useScreenUi();
  const { date } = useConsultFormat();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setStatus('loading');
    fetch(`${BASE_URL}/legal/policy/${policyKey}?lang=${lang === 'ar' ? 'ar' : 'en'}`)
      .then((r) => r.json())
      .then((d: Policy | null) => {
        if (!live) return;
        if (d?.content) {
          setPolicy(d);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (live) setStatus('error');
      });
    return () => {
      live = false;
    };
  }, [policyKey, lang, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const blocks = policy ? parseLegal(policy.content) : [];
  const effective = date(policy?.effective_date);

  return (
    <ConsultScreen title={title} onBack={legalBack} testID={testID}>
      <Gate status={status} onRetry={retry}>
        <Card theme={theme} padding="lg">
          <View style={{ gap: 10 }}>
            {blocks.map((b, i) =>
              b.kind === 'heading' ? (
                <Text key={i} accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, marginTop: i ? 8 : 0, ...flow }}>{b.text}</Text>
              ) : b.kind === 'bullet' ? (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.text.secondary, marginTop: 10 }} />
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, flex: 1, ...flow }}>{b.text}</Text>
                </View>
              ) : (
                <Text key={i} style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{b.text}</Text>
              ),
            )}
          </View>
        </Card>
        {policy?.version ? (
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
            {effective ? k('legal.version', { version: String(policy.version), date: effective }) : k('legal.versionOnly', { version: String(policy.version) })}
          </Text>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}

/** A notice page: a glyph, a headline, a line and up to two actions (the provider account notice). */
export function NoticePage({ headline, body, primary, secondary, testID }: { headline: string; body: string; primary: { label: string; onPress: () => void }; secondary?: { label: string; onPress: () => void }; testID?: string }) {
  return (
    <ConsultScreen title="" onBack={legalBack} testID={testID}>
      <ResultHero icon="stethoscope" tone="info" title={headline} body={body} />
      <View style={{ gap: 8, paddingTop: 16 }}>
        <CardAction label={primary.label} onPress={primary.onPress} flex />
        {secondary ? <CardAction label={secondary.label} onPress={secondary.onPress} tone="outline" flex /> : null}
      </View>
    </ConsultScreen>
  );
}
