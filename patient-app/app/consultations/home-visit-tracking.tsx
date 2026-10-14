import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon, Timeline } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, StatusTag, appointmentStatus, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

/**
 * Home visit tracking — board OrderTracking (canvas/OrderTracking.dc.html) for a home-visit appointment: the doctor, the
 * waiting time when the server states one, and the steps of the visit. Everything is GET /care/appointments/:id: a step
 * is reached when the appointment's status says so, and shows a time only when the status history recorded it. There is
 * no live map: the backend has no doctor position to draw.
 */

interface Appt {
  id?: string;
  appointment_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  status?: string;
  wait_time?: number;
  state_history?: Array<{ state?: string; at?: string }>;
}

const REACHED = {
  confirmed: ['CONFIRMED', 'EN_ROUTE', 'CHECKED_IN', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'],
  enRoute: ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'],
  arrived: ['CHECKED_IN', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'],
  done: ['COMPLETED'],
} as const;

export default function HomeVisitTrackingScreen() {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { clock } = useConsultFormat();
  const { appointmentId } = useLocalSearchParams();
  const [data, setData] = useState<Appt | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    if (!appointmentId) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const res = await apiFetch<Appt & { data?: Appt }>(`/care/appointments/${appointmentId}`);
      setData(res?.data || res || null);
      setStatus(res ? 'ready' : 'missing');
    } catch (e) {
      logError('consultations:home-visit-tracking', e);
      setData(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = String(data?.status ?? '').toUpperCase();
  const cancelled = current === 'CANCELLED' || current === 'NO_SHOW';
  const at = (state: string): string | undefined => {
    const hit = data?.state_history?.find((h) => String(h.state).toUpperCase() === state);
    return hit?.at ? clock(hit.at) : undefined;
  };
  const flags = [REACHED.confirmed.includes(current as never), REACHED.enRoute.includes(current as never), REACHED.arrived.includes(current as never), REACHED.done.includes(current as never)];
  const firstOpen = flags.findIndex((f) => !f);
  const steps = [
    { id: 'confirmed', label: k('consult.track.confirmed'), time: at('CONFIRMED') },
    { id: 'en-route', label: k('consult.track.enRoute'), time: at('EN_ROUTE') },
    { id: 'arrived', label: k('consult.track.arrived'), time: at('ARRIVED') ?? at('CHECKED_IN') },
    { id: 'done', label: k('consult.track.done'), time: at('COMPLETED') },
  ].map((s, i) => ({ ...s, state: (flags[i] ? 'done' : i === firstOpen ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming' }));
  const st = appointmentStatus(data?.status);
  const bookingId = data?.id || data?.appointment_id || (appointmentId ? String(appointmentId) : '');

  return (
    <ConsultScreen
      title={k('consult.track.title')}
      onRefresh={() => void load()}
      testID="home-visit-tracking-screen"
      footer={
        data && bookingId ? (
          <Button label={k('consult.track.message')} size="lg" fullWidth startIcon="chat-circle-text" onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: data.doctor_id, appointmentId: bookingId } } as unknown as Href)} theme={theme} testID="track-message" />
        ) : undefined
      }
    >
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.track.missing')} errorTitle={k('consult.track.loadError')}>
        {data ? (
          <Card theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FIcon icon="house" tone="mint" size={48} theme={theme} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{data.doctor_name || k('consult.doctorFallback')}</Text>
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.track.homeDoctor')}</Text>
                <StatusTag label={k(st.key)} tone={st.tone} />
              </View>
              {data.wait_time != null ? (
                <View style={{ alignItems: 'center', backgroundColor: c.service.mint.bg, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ ...scale(t, 'h3'), color: c.service.mint.fg }}>{num(data.wait_time)}</Text>
                  <Text style={{ ...scale(t, 'micro', 'regular'), color: c.service.mint.fg }}>{k('consult.track.minutes')}</Text>
                </View>
              ) : null}
            </View>
            {cancelled ? (
              <View style={{ marginTop: 12 }}>
                <StatusTag label={k('consult.status.cancelled')} tone="danger" />
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Timeline label={k('consult.track.title')} steps={steps} theme={theme} />
              </View>
            )}
          </Card>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
