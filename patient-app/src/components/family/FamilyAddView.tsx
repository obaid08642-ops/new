import React, { useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

import { Button, EmptyState, Input, Segmented, Spinner } from '../../../../packages/ui-native/src';
import { ResultHero, Section } from '../consult/ConsultKit';
import { HealthTabs, Notice, Panel, Row, useTab } from '../health/HealthKit';
import { message, step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { FAMILY_HUB, FamilyScreen } from './FamilyKit';

/**
 * Add or join (merge map row F, `/family/add?tab=invite|join|scan`): Invite shows the group's invite as a link, a QR code
 * or a code; Join with code takes a code and the relation; Scan QR reads an invite QR with the camera (its permission
 * handling is the old screen's). POST /family/invite and POST /family/join. The old /family/invite, /family/join,
 * /family/scan and /health/add-family-member redirect here with their query (a `code` opens Join with the code filled).
 */

const TABS = ['invite', 'join', 'scan'] as const;
const INVITE_URL = 'https://nabdahplus.app/join/';
const RELATIONS = ['spouse', 'child', 'parent', 'sibling', 'caregiver', 'other'] as const;

/** The invite code of a scanned payload: `https://nabdahplus.app/join/ABC123` or a bare `ABC123`; null when it is neither. */
export function extractInviteCode(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/\/join\/([A-Za-z0-9-]+)/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Za-z0-9-]{4,12}$/.test(s)) return s.toUpperCase();
  return null;
}

export function FamilyAddView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'invite');
  // The invite is created when Invite is first opened and kept while the person looks at the other tabs.
  const invite = useRef<string | null>(null);
  return (
    <FamilyScreen title={k('family.add.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace(FAMILY_HUB))} testID="family-add-screen">
      <HealthTabs tabs={TABS.map((key) => ({ key, label: k(`family.add.tab.${key}`) }))} value={tab} onChange={setTab} testID="add-tabs" />
      {tab === 'invite' ? <InviteTab cache={invite} /> : null}
      {tab === 'join' ? <JoinTab /> : null}
      {tab === 'scan' ? <ScanTab /> : null}
    </FamilyScreen>
  );
}

function InviteTab({ cache }: { cache: React.MutableRefObject<string | null> }) {
  const { k, theme, c, t } = useScreenUi();
  const [method, setMethod] = useState<'link' | 'qr' | 'code'>('link');
  const [code, setCode] = useState<string | null>(cache.current);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(cache.current === null);
  const started = useRef(false);

  const create = React.useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = (await apiFetch('/family/invite', { method: 'POST' })) as { invite_code?: string };
      cache.current = res.invite_code ?? null;
      setCode(cache.current);
      setFailed(!cache.current);
    } catch (e) {
      logError('family:invite', e);
      setCode(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  React.useEffect(() => {
    if (cache.current === null && !started.current) {
      started.current = true;
      void create();
    }
  }, [cache, create]);

  const url = `${INVITE_URL}${code ?? ''}`;
  const share = async () => {
    if (!code) return;
    try {
      await Share.share({ message: k('family.invite.shareMessage', { code, url }) });
    } catch (e) {
      logError('family:invite:share', e);
    }
  };

  if (loading) return <Spinner />;
  if (failed || !code) {
    return (
      <View style={{ gap: 12 }}>
        <Notice tone="danger" text={k('family.invite.failed')} />
        <Button label={k('consult.retry')} variant="outline" fullWidth onPress={() => void create()} theme={theme} testID="invite-retry" />
      </View>
    );
  }
  return (
    <>
      <Section title={k('family.invite.method')}>
        <Segmented label={k('family.invite.method')} value={method} onChange={(v) => setMethod(v as 'link' | 'qr' | 'code')} options={[{ value: 'link', label: k('family.invite.link') }, { value: 'qr', label: k('family.invite.qr') }, { value: 'code', label: k('family.invite.code') }]} theme={theme} />
        {method === 'link' ? (
          <View style={{ gap: 10 }}>
            <Input label={k('family.invite.link')} value={url} readOnly theme={theme} testID="invite-link" />
            <Button label={k('family.invite.share')} fullWidth onPress={() => void share()} theme={theme} testID="invite-share" />
          </View>
        ) : null}
        {method === 'qr' ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View accessibilityLabel={k('family.invite.qrLabel')} style={{ padding: 16, borderRadius: 20, backgroundColor: c.brand.canvas, borderWidth: 1, borderColor: c.border.hairline, alignItems: 'center', gap: 8 }} testID="invite-qr">
              <QRCode value={url} size={160} color={c.brand.ink} backgroundColor={c.brand.canvas} />
              <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary }}>{code}</Text>
            </View>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('family.invite.qrHint')}</Text>
          </View>
        ) : null}
        {method === 'code' ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ paddingHorizontal: 32, paddingVertical: 20, borderRadius: 18, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <Text selectable accessibilityLabel={`${k('family.invite.code')} ${code}`} style={{ ...scale(t, 'h1', 'bold'), color: c.text.primary, letterSpacing: 4, textAlign: 'center' }} testID="invite-code">{code}</Text>
            </View>
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('family.invite.codeHint')}</Text>
            <Button label={k('family.invite.share')} variant="outline" fullWidth onPress={() => void share()} theme={theme} />
          </View>
        ) : null}
      </Section>
      <Panel>
        <Row icon="shield-check" tone="blue" title={k('family.invite.permsTitle')} subtitle={k('family.invite.permsBody')} last />
      </Panel>
    </>
  );
}

function JoinTab() {
  const { k, theme } = useScreenUi();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const initial = Array.isArray(params.code) ? params.code[0] : params.code;
  const [code, setCode] = useState(initial ?? '');
  const [relation, setRelation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // What is stored is the relation and the name in Arabic, as the screen has always sent them.
      const stored = relation ? message('ar', `family.relation.${relation}`) : '';
      const res = (await apiFetch('/family/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: code.trim(), display_name: message('ar', 'family.join.defaultName'), ...(stored ? { relation: stored } : {}) }),
      })) as { ok?: boolean };
      if (res.ok) setJoined(true);
    } catch (e) {
      logError('family:join', e);
      setError((e as { message?: string } | null)?.message || k('family.join.failed'));
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <View style={{ gap: 16 }}>
        <ResultHero icon="check-circle" title={k('family.join.doneTitle')} body={k('family.join.doneBody')} />
        <Button label={k('family.join.goFamily')} size="lg" fullWidth onPress={() => router.replace(FAMILY_HUB)} theme={theme} testID="join-done" />
      </View>
    );
  }
  return (
    <>
      <Input label={k('family.join.code')} placeholder={k('family.join.codePlaceholder')} value={code} onChange={(v) => setCode(v.toUpperCase())} theme={theme} testID="join-code" />
      <Section title={k('family.join.relation')}>
        <HealthTabs tabs={RELATIONS.map((key) => ({ key, label: k(`family.relation.${key}`) }))} value={relation} onChange={setRelation} testID="join-relation" />
      </Section>
      {error ? <Notice tone="danger" text={error} /> : null}
      <Button label={k('family.join.submit')} size="lg" fullWidth loading={loading} disabled={!code.trim()} onPress={() => void join()} theme={theme} testID="join-submit" />
      <Button label={k('family.join.scan')} variant="outline" size="lg" fullWidth onPress={() => router.setParams({ tab: 'scan' })} theme={theme} testID="join-scan" />
    </>
  );
}

function ScanTab() {
  const { k, theme, c, t } = useScreenUi();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);
  const busy = useRef(false);

  const onScanned = ({ data }: { data?: string }) => {
    if (busy.current) return;
    const code = extractInviteCode(String(data || ''));
    if (!code) {
      setInvalid(true);
      setTimeout(() => setInvalid(false), 2000);
      return;
    }
    busy.current = true;
    router.setParams({ tab: 'join', code });
  };

  if (!permission) return <Spinner />;
  if (!permission.granted) {
    return <EmptyState icon="camera" tone="blue" title={k('family.scan.permTitle')} body={k('family.scan.permBody')} actionLabel={k('family.scan.grant')} onAction={() => void requestPermission()} theme={theme} testID="scan-permission" />;
  }
  const corner = { position: 'absolute' as const, width: 32, height: 32, borderColor: c.brand.coral, borderWidth: 4 };
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <View accessibilityLabel={k('family.scan.frame')} style={{ width: 260, height: 260, borderRadius: 24, overflow: 'hidden', backgroundColor: c.bg.media }} testID="scan-frame">
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />
        <View style={[corner, { top: 0, start: 0, borderEndWidth: 0, borderBottomWidth: 0, borderTopStartRadius: 12 }]} />
        <View style={[corner, { top: 0, end: 0, borderStartWidth: 0, borderBottomWidth: 0, borderTopEndRadius: 12 }]} />
        <View style={[corner, { bottom: 0, start: 0, borderEndWidth: 0, borderTopWidth: 0, borderBottomStartRadius: 12 }]} />
        <View style={[corner, { bottom: 0, end: 0, borderStartWidth: 0, borderTopWidth: 0, borderBottomEndRadius: 12 }]} />
      </View>
      {invalid ? <Notice tone="danger" text={k('family.scan.invalid')} /> : <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('family.scan.hint')}</Text>}
    </View>
  );
}
