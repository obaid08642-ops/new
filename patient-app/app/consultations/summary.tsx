/**
 * Consultation summary — board Consult's card language for the doctor's write-up. GET /care/appointments/:id/summary
 * returns the diagnosis, the prescription lines, the notes and the recommendations; when the doctor recommended a
 * follow-up inside a window, the page offers to book it. A part the doctor left empty is not drawn.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Button, Card, FIcon } from '../../../packages/ui-native/src';
import { ConsultScreen, Gate, Section, StatusTag, type GateStatus } from '../../src/components/consult/ConsultKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';

interface Med {
  medicine_name?: string;
  dose?: string;
  duration?: string;
  notes?: string;
}
interface Summary {
  doctor_id?: string;
  diagnosis?: string;
  prescription?: Med[];
  notes?: string;
  recommendations?: string;
  follow_up_recommended?: boolean;
  follow_up_window_days?: number;
}

export default function ConsultationSummaryScreen() {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [doctorId, setDoctorId] = useState('');
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
        try {
          const appt = await apiFetch<{ doctor_id?: string }>(`/care/appointments/${appointmentId}`);
          setDoctorId(appt?.doctor_id || '');
        } catch (e) {
          logError('consultations:summary:appointment', e);
        }
        setSummary(await apiFetch<Summary>(`/care/appointments/${appointmentId}/summary`));
        setStatus('ready');
      } catch (e) {
        const msg = String(e instanceof Error ? e.message : '');
        if (msg.includes('404') || msg.includes('not available') || msg.includes('غير موجود')) setStatus('missing');
        else {
          logError('consultations:summary', e);
          setStatus((await isOffline()) ? 'offline' : 'error');
        }
      } finally {
        setRefreshing(false);
      }
    },
    [appointmentId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const windowDays = summary?.follow_up_window_days ?? 7;
  const prescription = Array.isArray(summary?.prescription) ? summary.prescription : [];

  const bookFollowUp = () =>
    router.push({ pathname: '/consultations/booking-status', params: { doctorId: doctorId || summary?.doctor_id || '', followUp: 'true', windowDays: String(windowDays) } } as unknown as Href);

  const block = (title: string, text: string) => (
    <Section title={title}>
      <Card theme={theme}>
        <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.primary, ...flow }}>{text}</Text>
      </Card>
    </Section>
  );

  return (
    <ConsultScreen title={k('consult.summary.title')} onRefresh={() => void load(true)} refreshing={refreshing} testID="consultation-summary-screen">
      <Gate status={status} onRetry={() => void load()} missingTitle={k('consult.summary.notReady')} missingBody={k('consult.summary.notReadyBody')} errorTitle={k('consult.summary.loadError')}>
        {summary ? (
          <>
            {summary.follow_up_recommended ? (
              <Card theme={theme}>
                <View style={{ gap: 8 }}>
                  <StatusTag label={k('consult.summary.window', { n: num(windowDays) })} tone="info" />
                  <Text style={{ ...scale(t, 'small', 'regular'), lineHeight: 22, color: c.text.secondary, ...flow }}>{k('consult.summary.followUpBody', { n: num(windowDays) })}</Text>
                  <Button label={k('consult.summary.bookFollowUp')} size="md" fullWidth onPress={bookFollowUp} theme={theme} testID="summary-follow-up" />
                </View>
              </Card>
            ) : null}

            {summary.diagnosis ? block(k('consult.rx.diagnosis'), summary.diagnosis) : null}

            {prescription.length > 0 ? (
              <Section title={k('consult.summary.prescription')}>
                <Card theme={theme}>
                  {prescription.map((med, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: i === prescription.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
                      <FIcon icon="pill" tone="coral" size={40} theme={theme} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={{ ...scale(t, 'small', 'bold'), color: c.text.primary, ...flow }}>{med.medicine_name}</Text>
                        {[med.dose, med.duration].filter(Boolean).length > 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{[med.dose, med.duration].filter(Boolean).join(' · ')}</Text> : null}
                        {med.notes ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{med.notes}</Text> : null}
                      </View>
                    </View>
                  ))}
                  <View style={{ marginTop: 10 }}>
                    <Button label={k('consult.summary.toPharmacy')} variant="outline" size="md" fullWidth onPress={() => router.push({ pathname: '/consultations/prescription-from-doctor', params: { appointmentId } } as unknown as Href)} theme={theme} />
                  </View>
                </Card>
              </Section>
            ) : null}

            {summary.notes ? block(k('consult.rx.notes'), summary.notes) : null}
            {summary.recommendations ? block(k('consult.summary.recommendations'), summary.recommendations) : null}

            <Button label={k('consult.summary.rate')} variant="outline" size="md" fullWidth startIcon="star" onPress={() => router.push({ pathname: '/consultations/post-call-rating', params: { appointmentId } } as unknown as Href)} theme={theme} />
          </>
        ) : null}
      </Gate>
    </ConsultScreen>
  );
}
