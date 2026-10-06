import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StatusBar, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, EmptyState, ErrorState } from '../../../packages/ui-native/src';
import { CallButton, CallIdentity, useCallUi } from '../../src/components/consult/CallKit';
import { step as scale, tint } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';

/**
 * Virtual waiting room — no board (owner decision, 2026-10-04): the layout stays (a pulsing avatar, the doctor, the wait,
 * the join button), drawn with the dark tokens and the translation files. The appointment is GET /care/appointments/:id;
 * the join button is hidden when GET /config says video calls are off, and goes to the video call. No timer or queue is
 * invented: the wait is the server's `wait_time`, shown only when it sent one.
 */

interface Appt {
  doctor_name?: string;
  specialty?: string;
  specialty_ar?: string;
  wait_time?: number;
}

export default function VirtualWaitingRoomScreen() {
  const { appointmentId } = useLocalSearchParams();
  const { tk, c, k, num } = useCallUi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Appt | null>(null);
  const [failed, setFailed] = useState(false);
  // F37: hide the join button when video calls are disabled server-side (LiveKit unconfigured).
  const [callsEnabled, setCallsEnabled] = useState(true);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();

    if (appointmentId) {
      setLoading(true);
      setFailed(false);
      apiFetch<Appt & { data?: Appt }>(`/care/appointments/${appointmentId}`)
        .then((res) => {
          setData(res?.data || res);
          setLoading(false);
        })
        .catch((e) => {
          logError('consultations:waiting-room', e);
          setData(null);
          setFailed(true);
          setLoading(false);
        });
      // F37: explicit false hides the join button; errors fail open.
      apiFetch<{ features?: { video_calls?: boolean } }>(`/config`)
        .then((cfg) => {
          if (cfg?.features && cfg.features.video_calls === false) setCallsEnabled(false);
        })
        .catch(() => null);
    } else {
      setData(null);
      setLoading(false);
    }
  }, [appointmentId, pulseAnim]);

  const shell = { flex: 1, backgroundColor: c.bg.canvas, alignItems: 'center', justifyContent: 'center', padding: 24 } as const;

  if (loading) {
    return (
      <View style={shell}>
        <ActivityIndicator accessibilityLabel={k('consult.loading')} color={c.text.primary} size="large" />
      </View>
    );
  }
  if (failed) {
    return (
      <View style={shell}>
        <ErrorState title={k('consult.error.title')} body={k('consult.error.body')} retryLabel={k('consult.back')} onRetry={() => router.back()} theme="dark" />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={shell}>
        <EmptyState icon="calendar-dots" tone="blue" title={k('consult.missing.title')} body={k('consult.missing.body')} actionLabel={k('consult.back')} onAction={() => router.back()} theme="dark" />
      </View>
    );
  }

  const specialty = pickLocalized(data.specialty_ar, data.specialty);
  const wait = Number.isFinite(Number(data.wait_time)) && data.wait_time != null ? num(Number(data.wait_time), { minimumIntegerDigits: 2, useGrouping: false }) : '';

  return (
    <View style={shell} testID="virtual-waiting-room-screen">
      <StatusBar barStyle="light-content" />

      <View style={{ position: 'absolute', top: 50, end: 20 }}>
        <Button label={k('consult.close')} variant="secondary" size="md" onPress={() => router.back()} theme="dark" />
      </View>

      <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Animated.View
          style={{ position: 'absolute', top: 0, start: 0, end: 0, bottom: 0, borderRadius: 75, backgroundColor: c.action.primary.bg, opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] }), transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}
        />
        <CallIdentity name={data.doctor_name ?? ''} />
      </View>

      {specialty ? <Text style={{ ...scale(tk, 'small', 'regular'), color: c.text.onInverseSecondary, marginBottom: 24, textAlign: 'center' }}>{k('consult.call.videoWith', { specialty })}</Text> : null}

      {wait ? (
        <View style={{ backgroundColor: tint(c.text.primary, 0.1), borderRadius: 18, paddingVertical: 20, paddingHorizontal: 30, marginBottom: 24, alignItems: 'center', gap: 6 }}>
          <Text style={{ ...scale(tk, 'meta', 'regular'), color: c.text.onInverseSecondary }}>{k('consult.call.yourTurn')}</Text>
          <Text style={{ ...scale(tk, 'display'), color: c.text.primary }}>{wait}</Text>
        </View>
      ) : null}

      {callsEnabled ? <CallButton label={k('consult.call.join')} tone="accept" onPress={() => router.push({ pathname: '/consultations/video-call', params: { appointmentId } } as unknown as Href)} testID="waiting-join" /> : null}
    </View>
  );
}
