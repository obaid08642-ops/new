import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CARE_TONE, ConsultScreen, Gate, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Block, PersonRow, TrackHead, goBackDiag } from '../../src/components/diagnostics/DiagKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { recordOf } from '../../src/utils/labMappers';

type Rec = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/** Where the sample technician is: the arrival time, who it is with the call button, and what to prepare (board OrderTracking). Refreshes every 15 seconds. */
export default function TechnicianTrackingScreen() {
  const { t, c, k, num, flow } = useScreenUi();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [status, setStatus] = useState<GateStatus>('loading');
  const [tracking, setTracking] = useState<Rec | null>(null);

  const fetchTracking = useCallback(
    async (isStopped: () => boolean) => {
      try {
        const [bookingRes, trackRes] = await Promise.all([apiFetch<unknown>(`/labs/bookings/${bookingId}`).catch(() => null), apiFetch<unknown>(`/labs/bookings/${bookingId}/tracking`).catch(() => null)]);
        if (isStopped()) return;
        const tr = recordOf(trackRes);
        if (tr) setTracking(tr);
        setStatus((s) => (tr || recordOf(bookingRes) ? 'ready' : s === 'ready' ? s : 'error'));
      } catch (err) {
        logError('diagnostics:technician-tracking', err);
        if (!isStopped()) setStatus((await isOffline()) ? 'offline' : 'error');
      }
    },
    [bookingId],
  );

  useEffect(() => {
    if (!bookingId) {
      setStatus('error');
      return;
    }
    let stopped = false;
    const stop = () => stopped;
    void fetchTracking(stop);
    const interval = setInterval(() => void fetchTracking(stop), 15000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [bookingId, fetchTracking]);

  const eta = tracking?.eta !== undefined && tracking?.eta !== null && tracking?.eta !== '' ? Number(tracking.eta) : null;
  const phone = str(tracking?.techPhone);

  return (
    <ConsultScreen testID="diagnostics-technician-tracking" title={k('diag.tech.title')} onBack={goBackDiag}>
      <Gate status={status} onRetry={() => void fetchTracking(() => false)}>
        <Block gap={16}>
          <TrackHead label={k('diag.tech.eta')} value={eta !== null && Number.isFinite(eta) ? k('diag.track.minutes', { n: num(eta) }) : k('diag.tech.noEta')} />
          {str(tracking?.techName) ? (
            <PersonRow icon="user-circle" tone={CARE_TONE} title={str(tracking?.techName)} line={k('diag.tech.role')} actionIcon={phone ? 'headset' : undefined} actionLabel={k('diag.order.call')} onAction={() => void Linking.openURL(`tel:${phone}`)} />
          ) : null}
        </Block>
        <Block gap={8}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('diag.tech.tipsTitle')}</Text>
          <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('diag.tech.tips')}</Text>
        </Block>
      </Gate>
    </ConsultScreen>
  );
}
