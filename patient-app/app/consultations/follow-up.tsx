// app/consultations/follow-up.tsx — follow up a consultation: the real appointment from /care/appointments/:id
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, StatusTag, appointmentStatus, useConsultFormat, visitMode, type GateStatus } from '../../src/components/consult/ConsultKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { pickLocalized } from '../../src/utils/localize';
import { statusIs } from '../../src/utils/statusCase';

/**
 * Follow-up — board Consult's card language for a finished or running consultation. Everything is GET
 * /care/appointments/:id (and the doctor's name from GET /care/doctors/:id): the date, the status, the visit type, the
 * notes the patient wrote, the prescriptions, and the status history. The two actions chat with the doctor and book
 * again with the same doctor.
 */

interface Appt {
  id?: string;
  status?: string;
  slot_start?: string;
  service_type?: string;
  patient_notes?: string;
  doctor_id?: string;
  prescriptions?: Array<string | { name?: string }>;
  state_history?: Array<{ state?: string; at?: string; note?: string }>;
}

export default function FollowUpScreen() {
  const { theme, t, c, flow, k } = useScreenUi();
  const { date, clock, dateTime } = useConsultFormat();
  const params = useLocalSearchParams();
  const appointmentId = (params.id || params.appointmentId) as string;

  const [appt, setAppt] = useState<Appt | null>(null);
  // The doctor's names as sent; the one shown follows the language at render, so a language change updates it.
  const [doctorNames, setDoctorNames] = useState<{ ar?: string; en?: string }>({});
  const [status, setStatus] = useState<GateStatus>('loading');

  const load = useCallback(async () => {
    if (!appointmentId) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    try {
      const data = await apiFetch<Appt & { data?: Appt }>(`/care/appointments/${encodeURIComponent(appointmentId)}`);
      const a = data?.data || data;
      if (!a || !a.id) {
        setAppt(null);
        setStatus('missing');
        return;
      }
      setAppt(a);
      setStatus('ready');
      if (a.doctor_id) {
        apiFetch<{ name_ar?: string; name_en?: string }>(`/care/doctors/${encodeURIComponent(a.doctor_id)}`)
          .then((d) => setDoctorNames({ ar: d?.name_ar, en: d?.name_en }))
          .catch(() => undefined);
      }
    } catch {
      setAppt(null);
      setStatus((await isOffline()) ? 'offline' : 'error');
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // pickLocalized reads the current language at render; this screen re-renders on a language change (useScreenUi).
  const doctorName = pickLocalized(doctorNames.ar, doctorNames.en) || '';
  const prescriptions = Array.isArray(appt?.prescriptions) ? appt.prescriptions : [];
  const history = Array.isArray(appt?.state_history) ? [...appt.state_history].reverse() : [];
  const isCompleted = statusIs(appt?.status, ['completed']);
  const st = appointmentStatus(appt?.status);
  const mode = visitMode(appt?.service_type);

  return (
    <ConsultScreen title={k('consult.follow.title')} testID="follow-up-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.follow.loadError')} errorTitle={k('consult.follow.loadError')}>
        {appt ? (
          <>
            <Card theme={theme}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="stethoscope" tone="blue" size={48} theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{doctorName || k('consult.doctorFallback')}</Text>
                  {appt.slot_start ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{`${date(appt.slot_start, true)} · ${clock(appt.slot_start)}`}</Text> : null}
                  <StatusTag label={k(st.key)} tone={st.tone} />
                </View>
              </View>
            </Card>

            {mode ? (
              <Section title={k('consult.detail.visitType')}>
                <Card theme={theme}>
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k(`consult.mode.long.${mode}`)}</Text>
                </Card>
              </Section>
            ) : null}

            {appt.patient_notes ? (
              <Section title={k('consult.follow.notes')}>
                <Card theme={theme}>
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{appt.patient_notes}</Text>
                </Card>
              </Section>
            ) : null}

            <Section title={k('consult.follow.prescribed')}>
              <Card theme={theme}>
                {prescriptions.length === 0 ? (
                  <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k(isCompleted ? 'consult.follow.noneIssued' : 'consult.follow.afterVisit')}</Text>
                ) : (
                  prescriptions.map((p, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Glyph name="pill" size={16} color={c.text.link} />
                      <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, flex: 1, ...flow }}>{typeof p === 'string' ? p : p?.name || ''}</Text>
                    </View>
                  ))
                )}
                {prescriptions.length > 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <Button label={k('consult.follow.order')} variant="ghost" size="sm" startIcon="prescription" onPress={() => router.push('/(tabs)/pharmacy' as Href)} theme={theme} />
                  </View>
                ) : null}
              </Card>
            </Section>

            <Section title={k('consult.follow.history')}>
              {history.length === 0 ? (
                <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, textAlign: 'center', paddingVertical: 10 }}>{k('consult.follow.noHistory')}</Text>
              ) : (
                history.map((h, i) => {
                  const hs = appointmentStatus(h.state);
                  return (
                    <Card key={i} theme={theme} padding="sm">
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <StatusTag label={k(hs.key)} tone={hs.tone} />
                        {h.at ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary }}>{dateTime(h.at)}</Text> : null}
                      </View>
                      {h.note ? <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, marginTop: 6, ...flow }}>{h.note}</Text> : null}
                    </Card>
                  );
                })
              )}
            </Section>

            {appt.doctor_id ? (
              <View style={{ gap: 10 }}>
                <Button label={k('consult.follow.chat')} variant="outline" size="md" fullWidth startIcon="chat-circle-text" onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_id, appointmentId: appt.id } } as unknown as Href)} theme={theme} />
                <Button label={k('consult.follow.book')} size="lg" fullWidth startIcon="calendar-dots" onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: appt.doctor_id } } as unknown as Href)} theme={theme} />
              </View>
            ) : null}
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
