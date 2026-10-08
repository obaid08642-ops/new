/**
 * Clinic confirmation — board BookingConfirm's result (canvas/BookingConfirm.dc.html) for an accepted clinic booking:
 * the QR for reception, the place and the ways to reach it, the preparation list and the way to cancel or reschedule.
 * Sources: GET /care/appointments/:id and GET /care/doctors/:doctor_id. It is the confirmed state of booking-status
 * (merge map 2, section 1): both read the same appointment through the same endpoint.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Button, Card, FIcon } from '../../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, useConsultFormat, type GateStatus } from './ConsultKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
import { apiFetch } from '../../utils/api';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';

interface Facility {
  name?: string;
  address?: string;
  phone?: string;
  location?: { lat?: number; lng?: number };
}
interface Doctor {
  name?: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  phone?: string;
  location?: { lat?: number; lng?: number };
  facility?: Facility;
}
interface Appt {
  id?: string;
  slot_start?: string;
  doctor_id?: string;
  doctor_user_id?: string;
}

const TIPS = ['consult.clinic.tip1', 'consult.clinic.tip2', 'consult.clinic.tip3', 'consult.clinic.tip4'] as const;

export default function ClinicConfirmation({ appointmentId }: { appointmentId: string }) {
  const { theme, t, c, flow, k } = useScreenUi();
  const { date, clock } = useConsultFormat();
  // A QR must stay dark on light in either theme, or a reception scanner cannot read it.
  const light = tokens('light').color;

  const [appt, setAppt] = useState<Appt | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!appointmentId) {
        setStatus('missing');
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setStatus('loading');
      try {
        const a = await apiFetch<Appt>(`/care/appointments/${appointmentId}`);
        setAppt(a);
        if (a?.doctor_id) {
          try {
            setDoctor(await apiFetch<Doctor>(`/care/doctors/${a.doctor_id}`));
          } catch (e) {
            logError('consultations:clinic-confirm:doctor', e);
          }
        }
        setStatus(a ? 'ready' : 'missing');
      } catch (e) {
        logError('consultations:clinic-confirm', e);
        setStatus((await isOffline()) ? 'offline' : 'error');
      } finally {
        setRefreshing(false);
      }
    },
    [appointmentId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const facility = doctor?.facility ?? null;
  const clinicName = facility?.name || doctor?.clinic_name || k('consult.clinic.fallback');
  const address = facility?.address || doctor?.clinic_address || '';
  const phone = facility?.phone || doctor?.clinic_phone || doctor?.phone || '';
  const lat = facility?.location?.lat ?? doctor?.location?.lat;
  const lng = facility?.location?.lng ?? doctor?.location?.lng;
  const bookingCode = String(appt?.id || '').toUpperCase();

  const openDirections = () => {
    if (lat == null || lng == null) {
      router.push({ pathname: '/consultations/booking-status', params: { appointmentId, state: 'confirmed', view: 'location' } } as unknown as Href);
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(clinicName)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(clinicName)})`,
    });
    if (url) void Linking.openURL(url);
  };

  const callClinic = () => {
    if (!phone) {
      showLocalizedAlert(k('consult.clinic.unavailable'), k('consult.clinic.noPhone'));
      return;
    }
    void Linking.openURL(`tel:${phone}`);
  };

  const openChat = () => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt?.doctor_user_id || appt?.doctor_id, appointmentId } } as unknown as Href);

  return (
    <ConsultScreen
      title={k('consult.clinic.title')}
      actions={[{ key: 'close', label: k('consult.close'), icon: <Glyph name="x-circle" size={22} color={c.icon.primary} />, onPress: () => router.replace('/(tabs)' as Href) }]}
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      testID="clinic-confirm-screen"
    >
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.clinic.missing')} missingBody={k('consult.missing.body')}>
        {appt ? (
          <>
            <Card theme={theme}>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, textAlign: 'center' }}>{k('consult.clinic.showCode')}</Text>
                <View style={{ backgroundColor: light.bg.surface, padding: 16, borderRadius: 16 }}>
                  <QRCode value={`NABDAH:APPT:${bookingCode}`} size={170} color={light.text.primary} backgroundColor={light.bg.surface} />
                </View>
                <Text selectable style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.secondary, letterSpacing: 2 }}>{bookingCode.slice(0, 8)}</Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <InfoRow label={k('consult.detail.date')} value={appt.slot_start ? date(appt.slot_start, true) : ''} />
                <InfoRow label={k('consult.detail.time')} value={appt.slot_start ? clock(appt.slot_start) : ''} last />
              </View>
            </Card>

            <Section title={k('consult.clinic.details')}>
              <Card theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon="hospital" tone="blue" size={44} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{clinicName}</Text>
                    {doctor?.name ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{doctor.name}</Text> : null}
                    {address ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{address}</Text> : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <Button label={k('consult.clinic.directions')} variant="outline" size="md" startIcon="map-pin" onPress={openDirections} theme={theme} />
                  <Button label={k('consult.clinic.call')} variant="outline" size="md" startIcon="headset" onPress={callClinic} theme={theme} />
                  <Button label={k('consult.clinic.chat')} variant="outline" size="md" startIcon="chat-circle-text" onPress={openChat} theme={theme} />
                </View>
              </Card>
            </Section>

            <Section title={k('consult.clinic.before')}>
              <Card theme={theme}>
                {TIPS.map((tip) => (
                  <View key={tip} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 }}>
                    <Glyph name="check-circle" size={18} color={c.status.success.fg} />
                    <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, flex: 1, ...flow }}>{k(tip)}</Text>
                  </View>
                ))}
              </Card>
            </Section>

            <Section title={k('consult.clinic.policy')}>
              <Card theme={theme}>
                <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('consult.clinic.policyBody')}</Text>
                <View style={{ marginTop: 12 }}>
                  <Button label={k('consult.clinic.cancelReschedule')} variant="outline" size="md" fullWidth onPress={() => router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId } } as unknown as Href)} theme={theme} />
                </View>
              </Card>
            </Section>
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
