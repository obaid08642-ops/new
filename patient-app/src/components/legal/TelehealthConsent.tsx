import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '../../../../packages/ui-native/src';
import { Sheet } from '../consult/ConsultKit';
import { Notice } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { getDeviceId } from '../../utils/deviceId';
import { logError } from '../../utils/logger';
import { parseLegal, type Policy } from './LegalKit';

/**
 * D-38 (issue 1549): before the first online consultation the server refuses the booking or the call with
 * `telehealth_consent_required`. The app then shows the current telehealth consent (GET /legal/policy/telehealth_consent
 * in the user's language) and records the acceptance through POST /legal/accept/telehealth_consent, with this device's id
 * and the platform; the backend adds the version and the time. The booking or the call is retried only after that.
 */

export const TELEHEALTH_CONSENT_REQUIRED = 'telehealth_consent_required';

/** Whether an error thrown by apiFetch is the server asking for the telehealth consent. */
export function isTelehealthConsentRefusal(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return message.includes(TELEHEALTH_CONSENT_REQUIRED);
}

/** Records the acceptance of the current telehealth consent for the signed-in user. */
export async function acceptTelehealthConsent(): Promise<void> {
  const deviceId = await getDeviceId();
  await apiFetch('/legal/accept/telehealth_consent', {
    method: 'POST',
    headers: { 'x-device-id': deviceId, 'x-app-platform': Platform.OS },
    body: '{}',
  });
}

export function TelehealthConsentSheet({ open, onClose, onAccepted }: { open: boolean; onClose: () => void; onAccepted: () => void }) {
  const { theme, t, c, flow, lang, k } = useScreenUi();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoadFailed(false);
    apiFetch<Policy | null>(`/legal/policy/telehealth_consent?lang=${lang === 'ar' ? 'ar' : 'en'}`)
      .then((d) => {
        if (!live) return;
        if (d?.content) setPolicy(d);
        else setLoadFailed(true);
      })
      .catch((e) => {
        logError('legal:telehealth-consent', e);
        if (live) setLoadFailed(true);
      });
    return () => {
      live = false;
    };
  }, [open, lang]);

  const accept = async () => {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await acceptTelehealthConsent();
      onAccepted();
    } catch (e) {
      logError('legal:telehealth-consent-accept', e);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const blocks = policy ? parseLegal(policy.content) : [];
  return (
    <Sheet open={open} title={k('legal.telehealth.title')} onClose={onClose} closeLabel={k('consult.close')}>
      <View style={{ gap: 12 }} testID="telehealth-consent-sheet">
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('legal.telehealth.intro')}</Text>
        {policy ? (
          <ScrollView style={{ maxHeight: 280 }} accessibilityLabel={k('legal.telehealth.textLabel')}>
            <View style={{ gap: 8 }}>
              {blocks.map((b, i) =>
                b.kind === 'heading' ? (
                  <Text key={i} accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{b.text}</Text>
                ) : b.kind === 'bullet' ? (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.text.secondary, marginTop: 9 }} />
                    <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, flex: 1, ...flow }}>{b.text}</Text>
                  </View>
                ) : (
                  <Text key={i} style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{b.text}</Text>
                ),
              )}
            </View>
          </ScrollView>
        ) : null}
        {policy?.version ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('legal.versionOnly', { version: String(policy.version) })}</Text> : null}
        {loadFailed ? <Notice tone="warning" text={k('legal.telehealth.textUnavailable')} /> : null}
        {saveFailed ? <Notice tone="danger" text={k('legal.telehealth.failed')} /> : null}
        <Button label={k('legal.telehealth.accept')} size="lg" fullWidth loading={saving} disabled={saving || !policy} onPress={() => void accept()} theme={theme} testID="telehealth-consent-accept" />
      </View>
    </Sheet>
  );
}
