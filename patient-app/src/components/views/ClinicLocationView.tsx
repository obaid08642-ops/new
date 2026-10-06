import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, Card, FIcon } from '../../../../packages/ui-native/src';
import { ConsultScreen, Gate, type GateStatus } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import MapView, { Marker, PROVIDER_DEFAULT } from '../MapPrimitives';
import { apiFetch } from '../../utils/api';
import { isOffline } from '../../utils/isOffline';
import { logError } from '../../utils/logger';

/**
 * Clinic location (`clinic-confirm?view=location`) — the consult kit's screen (tokens, translation keys). The place is what
 * clinic-confirm reads: GET /care/appointments/:id and the doctor's facility (GET /care/doctors/:doctor_id). The map and the
 * directions button are drawn only when the doctor's record states coordinates; none is invented.
 */

interface Doctor {
  name?: string;
  clinic_name?: string;
  clinic_address?: string;
  location?: { lat?: number; lng?: number };
  facility?: { name?: string; address?: string; location?: { lat?: number; lng?: number } };
}

export default function ClinicLocationView() {
  const { theme, t, c, flow, k } = useScreenUi();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    if (!appointmentId) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const res = await apiFetch<{ id?: string; doctor_id?: string; data?: { id?: string; doctor_id?: string } }>(`/care/appointments/${encodeURIComponent(String(appointmentId))}`);
      const appt = res?.data || res;
      if (!appt) {
        setStatus('missing');
        return;
      }
      if (appt.doctor_id) {
        try {
          setDoctor(await apiFetch<Doctor>(`/care/doctors/${appt.doctor_id}`));
        } catch (e) {
          logError('consultations:clinic-location:doctor', e);
        }
      }
      setStatus('ready');
    } catch (e) {
      logError('consultations:clinic-location', e);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const facility = doctor?.facility ?? null;
  const clinicName = facility?.name || doctor?.clinic_name || k('consult.clinic.fallback');
  const address = facility?.address || doctor?.clinic_address || '';
  const lat = facility?.location?.lat ?? doctor?.location?.lat;
  const lng = facility?.location?.lng ?? doctor?.location?.lng;
  const placed = typeof lat === 'number' && typeof lng === 'number';

  const openDirections = () => {
    if (!placed) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(clinicName)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(clinicName)})`,
    });
    if (url) void Linking.openURL(url);
  };

  return (
    <ConsultScreen
      title={k('consult.detail.clinicPlace')}
      testID="clinic-location-screen"
      footer={placed ? <Button label={k('consult.clinic.directions')} size="lg" fullWidth startIcon="map-pin" onPress={openDirections} theme={theme} testID="clinic-directions" /> : undefined}
    >
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.clinic.missing')} missingBody={k('consult.missing.body')}>
        {placed ? (
          <View style={{ height: 230, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.border.hairline }}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={{ flex: 1 }}
              userInterfaceStyle={theme}
              initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              showsMyLocationButton={false}
              showsCompass={false}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: lat, longitude: lng }} title={clinicName} tracksViewChanges={false} />
            </MapView>
          </View>
        ) : null}
        <Card theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <FIcon icon="hospital" tone="blue" size={44} theme={theme} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{clinicName}</Text>
              {doctor?.name ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{doctor.name}</Text> : null}
              {address ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{address}</Text> : null}
            </View>
          </View>
        </Card>
      </Gate>
    </ConsultScreen>
  );
}
