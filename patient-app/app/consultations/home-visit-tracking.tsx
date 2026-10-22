import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon, Timeline } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, StatusTag, appointmentStatus, useConsultFormat, type GateStatus } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import MapView, { Marker, PROVIDER_DEFAULT } from '../../src/components/MapPrimitives';

/**
 * Home visit tracking — board OrderTracking (canvas/OrderTracking.dc.html) for a home-visit appointment: the doctor, the
 * waiting time when the server states one, and the steps of the visit. Everything is GET /care/appointments/:id: a step
 * is reached when the appointment's status says so, and shows a time only when the status history recorded it. While the
 * doctor is on the way the server shares the doctor's last position (2-app#3), drawn on a map with the visit address; the
 * screen reads it again every 30 seconds.
 */

interface Appt {
  id?: string;
  appointment_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  status?: string;
  wait_time?: number;
  state_history?: Array<{ state?: string; at?: string }>;
  doctor_position?: { lat?: number; lng?: number; at?: string };
  visit_location?: { lat?: number; lng?: number; address?: string };
}

const coord = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

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

  // while the doctor is on the way, follow the position the server shares
  const enRouteNow = String(data?.status ?? '').toUpperCase() === 'EN_ROUTE';
  useEffect(() => {
    if (!enRouteNow) return;
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [enRouteNow, load]);

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
  const docLat = enRouteNow ? coord(data?.doctor_position?.lat) : null;
  const docLng = enRouteNow ? coord(data?.doctor_position?.lng) : null;
  const homeLat = coord(data?.visit_location?.lat);
  const homeLng = coord(data?.visit_location?.lng);
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
              <View style={{ marginTop: 12, gap: 12 }}>
                {docLat !== null && docLng !== null ? (
                  <View style={{ height: 220, borderRadius: 16, overflow: 'hidden' }} accessibilityLabel={k('consult.track.mapLabel')}>
                    <MapView provider={PROVIDER_DEFAULT} style={StyleSheet.absoluteFill} region={{ latitude: docLat, longitude: docLng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
                      <Marker coordinate={{ latitude: docLat, longitude: docLng }} title={k('consult.track.pinDoctor')} pinColor={c.status.info.fg} />
                      {homeLat !== null && homeLng !== null ? <Marker coordinate={{ latitude: homeLat, longitude: homeLng }} title={k('consult.track.pinHome')} pinColor={c.status.danger.fg} /> : null}
                    </MapView>
                  </View>
                ) : null}
                {docLat !== null && data.doctor_position?.at ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.track.positionAt', { time: clock(data.doctor_position.at) })}</Text> : null}
                <Timeline label={k('consult.track.title')} steps={steps} theme={theme} />
              </View>
            )}
          </Card>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
