import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Card, FIcon } from '../../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, specialtyLook, type GateStatus } from '../../../src/components/consult/ConsultKit';
import { Glyph } from '../../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../../src/components/screen/ScreenKit';
import { apiFetch } from '../../../src/utils/api';
import { isOffline } from '../../../src/utils/isOffline';
import { logError } from '../../../src/utils/logger';
import { pickLocalized } from '../../../src/utils/localize';

/**
 * Clinic or hospital page — board DoctorFull's clinic card (canvas/DoctorFull.dc.html) as a page. Everything is GET
 * /care/facilities/:id: the photo, the name, the city, the description and the doctors who work there. A part the
 * server did not send is not drawn (no sample rating, no sample text).
 */

interface FacilityDoctor {
  id?: string;
  name?: string;
  name_ar?: string;
  specialty?: string;
  specialty_ar?: string;
  photo_url?: string;
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
  const { theme, t, c, flow, k } = useScreenUi();
  const [data, setData] = useState<Facility | null>(null);
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    if (!id) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const res = await apiFetch<Facility & { data?: Facility }>(`/care/facilities/${id}`);
      const f = res?.data || res || null;
      setData(f);
      setStatus(f ? 'ready' : 'missing');
    } catch (e) {
      logError('consultations:clinic', e);
      setData(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = pickLocalized(data?.name_ar, data?.name_en) || '';
  const about = pickLocalized(data?.description_ar, data?.description_en) || '';
  const doctors = Array.isArray(data?.doctors) ? data.doctors : [];

  return (
    <ConsultScreen title={name || k('consult.clinicPage.title')} testID="clinic-profile-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.clinicPage.missing')} errorTitle={k('consult.clinicPage.loadError')}>
        {data ? (
          <>
            <Card theme={theme} padding="none">
              {data.image ? (
                <Image accessibilityIgnoresInvertColors accessibilityLabel={name} source={{ uri: data.image }} resizeMode="cover" style={{ width: '100%', height: 180, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} />
              ) : (
                <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg.media, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                  <Glyph name="hospital" size={44} color={c.icon.secondary} />
                </View>
              )}
              <View style={{ padding: 16, gap: 6 }}>
                {name ? <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{name}</Text> : null}
                {data.city ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Glyph name="map-pin" size={16} color={c.icon.secondary} />
                    <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, flex: 1, ...flow }}>{data.city}</Text>
                  </View>
                ) : null}
              </View>
            </Card>

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
