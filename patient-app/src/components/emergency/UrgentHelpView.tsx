import React, { useState } from 'react';
import { Linking } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Location from 'expo-location';

import { Gate } from '../consult/ConsultKit';
import { Notice, useRemote } from '../health/HealthKit';
import { CareScreen, PrimaryAction, ltr } from '../care/CareKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { parseUrgentHelp, type UrgentHelp } from '../../utils/urgent-help';

interface SmsLink { name: string; href: string }
type Shared = { kind: 'sent'; notified: number; sms: SmsLink[] } | { kind: 'error' | 'permission' } | null;

/** POST /emergency/share-location answer: how many contacts got it in the app, and an SMS link for each of the others. */
export function parseShareResult(value: unknown): { notified: number; sms: SmsLink[] } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as { notified?: unknown; sms_links?: unknown };
  const notified = typeof v.notified === 'number' && v.notified >= 0 ? v.notified : 0;
  const sms = (Array.isArray(v.sms_links) ? v.sms_links : []).flatMap((row) => {
    const r = row as { name?: unknown; href?: unknown };
    return typeof r?.href === 'string' && r.href.startsWith('sms:') ? [{ name: typeof r.name === 'string' ? r.name : '', href: r.href }] : [];
  });
  return { notified, sms };
}

/**
 * The one urgent-help screen (owner decision 14): a calm page with a `tel:` button whose number is the one the admin set
 * (GET /mental-health/urgent-help, public, key `mental_health_urgent_help`). No number is written in the app: without one
 * there is no button and the page says so. The second action of decision 14, "send my location to my family", posts the
 * device position to POST /emergency/share-location, which notifies the patient's emergency contacts who use the app and
 * answers an SMS link for the others (#665). No ambulance, no dispatch, no tracking.
 */
export function UrgentHelpView() {
  const { k, num } = useScreenUi();
  const help = useRemote<UrgentHelp | null>(async () => parseUrgentHelp(await apiFetch('/mental-health/urgent-help')), [], 'emergency:urgent-help');
  const number = help.data;
  const call = () => { if (number) Linking.openURL(`tel:${number.dial}`).catch(() => undefined); };
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState<Shared>(null);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    setShared(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setShared({ kind: 'permission' }); return; }
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const res = parseShareResult(await apiFetch('/emergency/share-location', { method: 'POST', body: JSON.stringify({ lat: here.coords.latitude, lng: here.coords.longitude }) }));
      setShared(res ? { kind: 'sent', ...res } : { kind: 'error' });
    } catch (e) {
      logError('emergency:share-location', e);
      setShared({ kind: 'error' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <CareScreen title={k('emergency.title')} testID="urgent-help">
      <Notice tone="info" text={k('emergency.intro')} testID="urgent-help-intro" />
      <Gate status={help.status} onRetry={() => void help.reload()}>
        {number ? (
          <PrimaryAction label={k('emergency.call', { number: ltr(number.phone) })} onPress={call} testID="urgent-help-call" />
        ) : (
          <Notice tone="warning" text={k('emergency.unavailable')} testID="urgent-help-unavailable" />
        )}
      </Gate>
      <PrimaryAction label={k('emergency.share')} variant="outline" loading={sharing} onPress={() => void share()} testID="urgent-help-share" />
      {shared?.kind === 'permission' ? <Notice tone="warning" text={k('emergency.sharePermission')} testID="urgent-help-share-permission" /> : null}
      {shared?.kind === 'error' ? <Notice tone="danger" text={k('emergency.shareError')} testID="urgent-help-share-error" /> : null}
      {shared?.kind === 'sent' && shared.notified === 0 && shared.sms.length === 0 ? (
        <>
          <Notice tone="warning" text={k('emergency.shareNoContacts')} testID="urgent-help-share-none" />
          <PrimaryAction label={k('emergency.shareAddContacts')} variant="outline" onPress={() => router.push('/health/emergency-contacts' as Href)} />
        </>
      ) : null}
      {shared?.kind === 'sent' && shared.notified > 0 ? <Notice tone="success" text={k('emergency.shareSent', { n: num(shared.notified) })} testID="urgent-help-share-sent" /> : null}
      {shared?.kind === 'sent' ? shared.sms.map((link, i) => (
        <PrimaryAction key={`${link.href}-${i}`} label={k('emergency.shareSms', { name: link.name || k('emergency.shareContact') })} variant="outline" onPress={() => { Linking.openURL(link.href).catch(() => undefined); }} testID={`urgent-help-sms-${i}`} />
      )) : null}
      <Notice tone="warning" text={k('emergency.note')} />
    </CareScreen>
  );
}
