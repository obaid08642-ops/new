import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, Chip, FIcon } from '../../../../packages/ui-native/src';
import { ConsultScreen, Gate, InfoRow, Section, specialtyLook, type GateStatus } from '../../../src/components/consult/ConsultKit';
import MapView, { Marker, PROVIDER_DEFAULT } from '../../../src/components/MapPrimitives';
import { Glyph } from '../../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { pickLocalized } from '../../../src/utils/localize';
import { optimizedImageUri } from '../../../src/utils/optimizedImage';
import { facilityHoursRows, facilityPoint, type FacilityHoursRow } from '../../../src/utils/facilityPage';

/**
 * Clinic or hospital page — board DoctorFull's clinic card (canvas/DoctorFull.dc.html) as a page. It reads GET /care/facilities/:id
 * (the photo, the name, the city, the description and the doctors who work there) and GET /entity-graph/related/facility/:id (the
 * address, the phone, the pin, the opening hours and the departments; the one that also answers for a hospital registered through
 * the provider app, which the map lists by its profile id). A part neither sent is not drawn (no sample rating, no sample text).
 */

interface FacilityDoctor {
  id?: string;
  name?: string;
  name_ar?: string;
  specialty?: string;
  specialty_ar?: string;
  photo_url?: string;
}
interface GraphDoctor {
  id?: string;
  name_ar?: string | null;
  name_en?: string | null;
  specialty?: string | null;
}
interface GraphFacility {
  entity?: {
    name_ar?: string | null;
    name_en?: string | null;
    city?: string | null;
    phone?: string | null;
    address?: string | null;
    logo?: string | null;
    lat?: number | null;
    lng?: number | null;
    working_hours?: FacilityHoursRow[] | null;
  } | null;
  relationships?: { doctors?: GraphDoctor[] | null; departments?: string[] | null } | null;
}
interface Facility {
  image?: string;
  name_ar?: string;
  name_en?: string;
  city?: string;
  description_ar?: string;
  description_en?: string;
  doctors?: FacilityDoctor[];
}

export default function ClinicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, t, c, flow, k, lang } = useScreenUi();
  const [data, setData] = useState<Facility | null>(null);
  const [graph, setGraph] = useState<GraphFacility | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    if (!id) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const [care, found] = await Promise.allSettled([
        apiFetch<Facility & { data?: Facility }>(`/care/facilities/${id}`),
        apiFetch<GraphFacility>(`/entity-graph/related/facility/${encodeURIComponent(String(id))}`),
      ]);
      if (care.status === 'rejected' && found.status === 'rejected') throw care.reason;
      const f = care.status === 'fulfilled' ? care.value?.data || care.value || null : null;
      const g = found.status === 'fulfilled' ? found.value || null : null;
      setData(f);
      setGraph(g);
      setStatus(f || g?.entity ? 'ready' : 'missing');
    } catch (e) {
      logError('consultations:clinic', e);
      setData(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const entity = graph?.entity ?? null;
  const name = pickLocalized(data?.name_ar ?? entity?.name_ar, data?.name_en ?? entity?.name_en) || '';
  const about = pickLocalized(data?.description_ar, data?.description_en) || '';
  const city = data?.city || entity?.city || '';
  const image = data?.image || entity?.logo || '';
  const careDoctors = Array.isArray(data?.doctors) ? data.doctors : [];
  // the page of a hospital registered through the provider app has no care record: its doctors come from the entity graph
  const doctors: FacilityDoctor[] = careDoctors.length > 0
    ? careDoctors
    : (graph?.relationships?.doctors ?? []).map((d) => ({ id: d.id, name_ar: d.name_ar ?? undefined, name: d.name_en ?? undefined, specialty: d.specialty ?? undefined }));
  const departments = (graph?.relationships?.departments ?? []).filter((d) => typeof d === 'string' && d.length > 0);
  const point = facilityPoint(entity?.lat, entity?.lng);
  const hours = facilityHoursRows(lang, entity?.working_hours ?? [], k('consult.clinicPage.closed'));
  const phone = entity?.phone || '';
  const openDirections = () => {
    if (!point) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(name)}@${point.lat},${point.lng}`,
      android: `geo:0,0?q=${point.lat},${point.lng}(${encodeURIComponent(name)})`,
    });
    if (url) void Linking.openURL(url);
  };

  return (
    <ConsultScreen title={name || k('consult.clinicPage.title')} testID="clinic-profile-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.clinicPage.missing')} errorTitle={k('consult.clinicPage.loadError')}>
        {data || entity ? (
          <>
            <Card theme={theme} padding="none">
              {image ? (
                <Image cachePolicy="memory-disk" accessibilityIgnoresInvertColors accessibilityLabel={name} source={{ uri: optimizedImageUri(image, 400) }} contentFit="cover" style={{ width: '100%', height: 180, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />
              ) : (
                <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: c.service.blue.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                  <FIcon icon="hospital" tone="blue" chip="none" size={44} theme={theme} />
                </View>
              )}
              <View style={{ padding: 16, gap: 6 }}>
                {name ? <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{name}</Text> : null}
                {city ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Glyph name="map-pin" size={16} color={c.icon.secondary} />
                    <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, flex: 1, ...flow }}>{city}</Text>
                  </View>
                ) : null}
              </View>
            </Card>

            {entity?.address || phone || point ? (
              <Section title={k('consult.clinicPage.address')}>
                <Card theme={theme}>
                  {entity?.address ? <InfoRow label={k('consult.clinicPage.address')} value={entity.address} last={!phone} /> : null}
                  {phone ? <InfoRow label={k('consult.clinicPage.phone')} value={phone} last /> : null}
                </Card>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {phone ? <Button label={k('consult.clinicPage.call')} variant="outline" size="md" startIcon="phone" onPress={() => void Linking.openURL(`tel:${phone}`)} theme={theme} testID="clinic-call" /> : null}
                  {point ? <Button label={k('consult.clinicPage.directions')} variant="outline" size="md" startIcon="map-pin" onPress={openDirections} theme={theme} testID="clinic-directions" /> : null}
                </View>
                {point ? (
                  <View style={{ height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.border.hairline }}>
                    <MapView
                      provider={PROVIDER_DEFAULT}
                      style={{ flex: 1 }}
                      userInterfaceStyle={theme}
                      initialRegion={{ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                      showsMyLocationButton={false}
                      showsCompass={false}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} title={name} tracksViewChanges={false} />
                    </MapView>
                  </View>
                ) : null}
              </Section>
            ) : null}

            {hours.length > 0 ? (
              <Section title={k('consult.clinicPage.hours')}>
                <Card theme={theme}>
                  {hours.map((row, i) => <InfoRow key={row.label} label={row.label} value={row.value} last={i === hours.length - 1} />)}
                </Card>
              </Section>
            ) : null}

            {departments.length > 0 ? (
              <Section title={k('consult.clinicPage.services')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {departments.map((d) => <Chip key={d} label={d} theme={theme} />)}
                </View>
              </Section>
            ) : null}

            {about ? (
              <Section title={k('consult.clinicPage.about')}>
                <Card theme={theme}>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 24, color: c.text.secondary, ...flow }}>{about}</Text>
                </Card>
              </Section>
            ) : null}

            {doctors.length > 0 ? (
              <Section title={k('consult.clinicPage.doctors')}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {doctors.map((doc, i) => {
                    const dn = pickLocalized(doc.name_ar, doc.name) || '';
                    const sp = pickLocalized(doc.specialty_ar, doc.specialty) || '';
                    const look = specialtyLook(doc.specialty_ar || doc.specialty);
                    return (
                      <Pressable key={doc.id || i} accessibilityRole="button" accessibilityLabel={dn} onPress={() => doc.id && router.push(`/consultations/doctor/${doc.id}` as Href)} style={{ width: 150, minHeight: 44 }}>
                        <Card theme={theme} padding="sm">
                          <View style={{ alignItems: 'center', gap: 8 }}>
                            <FIcon icon={look.icon} tone={look.tone} size={56} theme={theme} />
                            <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, textAlign: 'center' }}>{dn}</Text>
                            {sp ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{sp}</Text> : null}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Section>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
