import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';

import { Card } from '../../../../packages/ui-native/src';
import { Gate, Section, Sheet } from '../consult/ConsultKit';
import { Notice, Panel, Row, bodyOf, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { PolicyCard } from './PolicyText';
import { LegalDocumentBody, type PolicyKey } from '../legal/LegalKit';

/**
 * The About and Legal tabs of the one Help and policies screen (HelpView, `?tab=about` and `?tab=legal`): the app and its version, the
 * cancellation and returns policy (GET /system-config/public), then the published policy documents (GET /legal/policies, and
 * GET /legal/policy/:key?lang= for the text of the one opened). `?doc=` opens one policy section.
 */

/** The two patient documents shown as sections of the legal tab; `?doc=` opens one (the old screens redirect with it). */
const SECTIONS: { key: PolicyKey; title: string; icon: 'arrows-left-right' | 'video-camera'; tone: 'amber' | 'blue' }[] = [
  { key: 'refund_policy', title: 'legal.refund.title', icon: 'arrows-left-right', tone: 'amber' },
  { key: 'telehealth_consent', title: 'legal.telehealth.title', icon: 'video-camera', tone: 'blue' },
];

interface PolicyListItem { key: string; title_ar?: string; title_en?: string; version?: string | number }
interface PolicyDoc { title?: string; version?: string | number; content?: string }

export function AboutTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const version = Constants.expoConfig?.version ?? '';
  return (
    <Card theme={theme}>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, ...flow }}>{k('common.appName')}</Text>
        {version ? <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('set.version', { version })}</Text> : null}
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{k('set.about.body')}</Text>
      </View>
    </Card>
  );
}

export function LegalTab() {
  const { k, lang } = useScreenUi();
  const list = useRemote(async () => rowsOf<PolicyListItem>(await apiFetch('/legal/policies')), [], 'settings:legal');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [doc, setDoc] = useState<PolicyDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const rows = list.data ?? [];
  const { doc: docParam } = useLocalSearchParams<{ doc?: string }>();
  const [openDoc, setOpenDoc] = useState<string | null>(SECTIONS.some((x) => x.key === docParam) ? (docParam as string) : null);

  const open = async (key: string) => {
    setOpenKey(key);
    setDoc(null);
    setFailed(false);
    setLoading(true);
    try {
      setDoc(bodyOf<PolicyDoc>(await apiFetch(`/legal/policy/${encodeURIComponent(key)}?lang=${lang === 'ar' ? 'ar' : 'en'}`)));
    } catch (e) {
      logError('settings:legal-policy', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  const title = (row: PolicyListItem) => (lang === 'ar' ? row.title_ar || row.title_en : row.title_en || row.title_ar) || row.key;
  const opened = rows.find((row) => row.key === openKey);

  return (
    <>
      <PolicyCard kind="cancellation" title={k('set.legal.cancellation')} />
      <PolicyCard kind="returns" title={k('set.legal.returns')} />
      {/* D-38: the full cancellation and refund policy and the telehealth consent, as sections of this screen */}
      {SECTIONS.map((section) => (
        <View key={section.key} style={{ gap: 8 }} testID={`legal-section-${section.key}`}>
          <Panel>
            <Row icon={section.icon} tone={section.tone} title={k(section.title)} onPress={() => setOpenDoc(openDoc === section.key ? null : section.key)} last testID={`legal-${section.key}-toggle`} />
          </Panel>
          {openDoc === section.key ? <LegalDocumentBody policyKey={section.key} /> : null}
        </View>
      ))}
      <Section title={k('set.legal.documents')}>
        <Gate status={list.status} onRetry={() => void list.reload()}>
          {rows.length === 0 ? (
            <Notice tone="info" text={k('set.legal.none')} />
          ) : (
            <Panel testID="legal-documents">
              {rows.map((row, i) => (
                <Row key={row.key} icon="file-text" tone="violet" title={title(row)} subtitle={row.version ? k('set.legal.version', { version: row.version }) : undefined} onPress={() => void open(row.key)} last={i === rows.length - 1} testID={`legal-${row.key}`} />
              ))}
            </Panel>
          )}
        </Gate>
      </Section>
      <Sheet open={openKey !== null} title={doc?.title || (opened ? title(opened) : '')} onClose={() => setOpenKey(null)} closeLabel={k('consult.close')}>
        {loading ? <Notice tone="info" text={k('common.loading')} /> : null}
        {failed ? <Notice tone="danger" text={k('set.legal.failed')} /> : null}
        {doc?.content ? <LegalText text={doc.content} /> : null}
      </Sheet>
    </>
  );
}

function LegalText({ text }: { text: string }) {
  const { t, c, flow } = useScreenUi();
  return <Text selectable style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.primary, ...flow }}>{text}</Text>;
}
